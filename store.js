// Data layer. Every method is async so a hosted backend (Supabase/Firebase)
// can replace LocalStore without touching app.js.
(function () {
  const KEY = "gwwlc-data-v1";
  const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);

  async function sha(text) {
    const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode("gwwlc:" + text));
    return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
  }

  class LocalStore {
    load() {
      try { return JSON.parse(localStorage.getItem(KEY)) || this.empty(); }
      catch { return this.empty(); }
    }
    empty() { return { users: [], weighins: [], shouts: [], adminHash: null }; }
    save(d) { localStorage.setItem(KEY, JSON.stringify(d)); }

    async listUsers() { return this.load().users; }
    async addUser({ name, track, pin }) {
      const d = this.load();
      if (d.users.some((u) => u.name.toLowerCase() === name.toLowerCase())) throw new Error("That name is taken");
      const u = { id: uid(), name, track, pinHash: await sha(pin), active: true };
      d.users.push(u); this.save(d); return u;
    }
    async updateUser(id, patch) {
      const d = this.load();
      const u = d.users.find((x) => x.id === id);
      if (!u) throw new Error("No such user");
      if (patch.pin) { patch.pinHash = await sha(patch.pin); delete patch.pin; }
      Object.assign(u, patch); this.save(d); return u;
    }
    async login(name, pin) {
      const u = this.load().users.find((x) => x.name.toLowerCase() === name.trim().toLowerCase());
      if (!u || u.pinHash !== (await sha(pin))) throw new Error("Name or PIN didn't match");
      return u;
    }

    async listWeighins() { return this.load().weighins; }
    async upsertWeighin(userId, week, weight) {
      const d = this.load();
      let w = d.weighins.find((x) => x.userId === userId && x.week === week);
      if (w) { w.weight = weight; w.at = new Date().toISOString(); }
      else { w = { id: uid(), userId, week, weight, at: new Date().toISOString() }; d.weighins.push(w); }
      this.save(d); return w;
    }
    async deleteWeighin(id) {
      const d = this.load(); d.weighins = d.weighins.filter((x) => x.id !== id); this.save(d);
    }

    async listShouts() { return this.load().shouts; }
    async addShout(fromId, toId, text) {
      const d = this.load();
      const s = { id: uid(), fromId, toId, text, at: new Date().toISOString(), reactions: {} };
      d.shouts.push(s); this.save(d); return s;
    }
    async react(shoutId, userId, emoji) {
      const d = this.load(); const s = d.shouts.find((x) => x.id === shoutId); if (!s) return;
      s.reactions = s.reactions || {};
      const list = (s.reactions[emoji] = s.reactions[emoji] || []);
      const i = list.indexOf(userId); i >= 0 ? list.splice(i, 1) : list.push(userId);
      this.save(d);
    }
    async deleteShout(id) {
      const d = this.load(); d.shouts = d.shouts.filter((x) => x.id !== id); this.save(d);
    }

    async hasAdmin() { return !!this.load().adminHash; }
    async setAdmin(pass) { const d = this.load(); d.adminHash = await sha("admin:" + pass); this.save(d); }
    async checkAdmin(pass) { return this.load().adminHash === (await sha("admin:" + pass)); }

    async exportAll() { return this.load(); }
    async importAll(data) { this.save(data); }
    async reset() { localStorage.removeItem(KEY); }
  }

  // Shared database via Supabase. Everything goes through Postgres functions
  // (see supabase/schema.sql) that check the person's PIN or commissioner passcode.
  class SupabaseStore {
    constructor(url, key) {
      this.url = url.replace(/\/$/, "");
      this.key = key;
      this.cred = JSON.parse(localStorage.getItem("gwwlc-cred") || "null");
      this.adminHash = sessionStorage.getItem("gwwlc-admin");
      this.cache = null;
    }
    async rpc(fn, args = {}) {
      const headers = { apikey: this.key, "Content-Type": "application/json" };
      if (this.key.startsWith("eyJ")) headers.Authorization = "Bearer " + this.key; // legacy anon JWT
      let res;
      try { res = await fetch(`${this.url}/rest/v1/rpc/${fn}`, { method: "POST", headers, body: JSON.stringify(args) }); }
      catch { throw new Error("Can't reach the server. Check your connection."); }
      const text = await res.text();
      const body = text ? JSON.parse(text) : null;
      if (!res.ok) {
        if (body && body.message === "Please log in again") this.logout();
        throw new Error((body && body.message) || "Server error " + res.status);
      }
      return body;
    }
    changed() { this.cache = null; }
    async all() {
      if (this.cache && Date.now() - this.cache.t < 1500) return this.cache.d;
      let d = { users: [], weighins: [], shouts: [] };
      if (this.adminHash) d = await this.rpc("gw_admin", { p_hash: this.adminHash, p_action: "data" });
      else if (this.cred) d = await this.rpc("gw_data", { p_uid: this.cred.uid, p_hash: this.cred.hash });
      d.weighins.forEach((w) => (w.weight = Number(w.weight)));
      this.cache = { t: Date.now(), d };
      return d;
    }
    admin(action, args = {}) { this.changed(); return this.rpc("gw_admin", { p_hash: this.adminHash, p_action: action, p_args: args }); }
    me(fn, args) { this.changed(); return this.rpc(fn, { p_uid: this.cred.uid, p_hash: this.cred.hash, ...args }); }

    async listUsers() { return (await this.all()).users; }
    async listWeighins() { return (await this.all()).weighins; }
    async listShouts() { return (await this.all()).shouts; }

    async login(name, pin) {
      const hash = await sha(pin);
      const u = await this.rpc("gw_login", { p_name: name, p_hash: hash });
      this.cred = { uid: u.id, hash };
      localStorage.setItem("gwwlc-cred", JSON.stringify(this.cred));
      this.changed();
      return u;
    }
    logout() { this.cred = null; localStorage.removeItem("gwwlc-cred"); this.changed(); }

    async addUser({ name, track, pin }) { return this.admin("add_user", { name, track, pinHash: await sha(pin) }); }
    async updateUser(id, patch) {
      const args = { id };
      if (patch.pin) args.pinHash = await sha(patch.pin);
      if (patch.track) args.track = patch.track;
      if (patch.name) args.name = patch.name;
      if (typeof patch.active === "boolean") args.active = patch.active;
      if (!this.adminHash && this.cred && id === this.cred.uid && args.pinHash) {
        await this.me("gw_set_pin", { p_new: args.pinHash });
        this.cred.hash = args.pinHash;
        localStorage.setItem("gwwlc-cred", JSON.stringify(this.cred));
        return;
      }
      return this.admin("update_user", args);
    }
    async upsertWeighin(userId, week, weight) {
      if (this.adminHash) return this.admin("upsert_weighin", { userId, week, weight });
      return this.me("gw_weighin", { p_week: week, p_weight: weight });
    }
    async deleteWeighin(id) { return this.admin("delete_weighin", { id }); }
    async addShout(fromId, toId, text) { return this.me("gw_shout", { p_to: toId, p_text: text }); }
    async react(shoutId, userId, emoji) { return this.me("gw_react", { p_shout: shoutId, p_emoji: emoji }); }
    async deleteShout(id) { return this.admin("delete_shout", { id }); }

    async hasAdmin() { return this.rpc("gw_admin_has"); }
    async setAdmin(pass) {
      const h = await sha("admin:" + pass);
      await this.rpc("gw_admin_set", { p_new: h });
      this.adminHash = h; sessionStorage.setItem("gwwlc-admin", h); this.changed();
    }
    async checkAdmin(pass) {
      const h = await sha("admin:" + pass);
      try { await this.rpc("gw_admin", { p_hash: h, p_action: "check" }); } catch { return false; }
      this.adminHash = h; sessionStorage.setItem("gwwlc-admin", h); this.changed();
      return true;
    }
    exitAdmin() { this.adminHash = null; sessionStorage.removeItem("gwwlc-admin"); this.changed(); }

    async exportAll() { return this.admin("export"); }
    async importAll(data) { return this.admin("import", data); }
  }

  const C = window.GW_CONFIG || {};
  window.GW_STORE = C.backend === "supabase" && C.supabaseUrl && C.supabaseKey
    ? new SupabaseStore(C.supabaseUrl, C.supabaseKey)
    : new LocalStore();
})();

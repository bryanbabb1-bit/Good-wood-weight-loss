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

  window.GW_STORE = new LocalStore();
})();

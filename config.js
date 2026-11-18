// Challenge settings. Edit these, no code changes needed elsewhere.
window.GW_CONFIG = {
  name: "Good Wood Weight Loss Challenge",
  startDate: "2026-11-30",   // Week 0: everyone enters a starting weight
  weeks: 12,                 // Number of weekly weigh-ins after the start
  weighInDay: 1,             // 0=Sun, 1=Mon ... weekly weigh-in day
  milestones: [2.5, 5, 7.5, 10, 15], // % change milestones that earn a shout-out
  showRawWeights: false,     // false = others only see % and lbs changed
  // Backend: "supabase" = shared database (needs URL + key below).
  //          "local"    = data stays in this browser only (demo/testing).
  backend: "local",
  supabaseUrl: "",   // e.g. https://abcdxyz.supabase.co
  supabaseKey: "",   // anon / publishable key (safe to be public)
};

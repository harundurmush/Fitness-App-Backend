// data/injuryAdaptations.js
module.exports = {
  knee: {
    avoid: ["Jump Rope", "Sprints", "Squats", "Step-ups"],
    alternatives: {
      "Jump Rope": "Seated Battle Rope",
      "Sprints": "Seated Arm Ergometer",
      "Squats": "Glute Bridge",
      "Step-ups": "Seated Leg Extensions"
    }
  },
  shoulder: {
    avoid: ["Overhead Press", "Push-ups", "Pull-ups (Bar)"],
    alternatives: {
      "Overhead Press": "Front Raise (Light Dumbbell)",
      "Push-ups": "Wall Push-ups",
      "Pull-ups (Bar)": "Band Assisted Rows"
    }
  },
  lower_back: {
    avoid: ["Deadlift", "Cable Rows", "Towel Rows"],
    alternatives: {
      "Deadlift": "Hip Thrust",
      "Cable Rows": "Chest Supported Rows",
      "Towel Rows": "Resistance Band Rows"
    }
  }
};
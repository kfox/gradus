
Gradus = {};

importScripts(
  "../assets/score.js",
  "../assets/score.staff_element.js",
  "../assets/score.tickable.js",
  "../assets/score.set.js",

  "../assets/score.glyph.js",
  "../assets/score.break.js",
  "../assets/score.format.js",
  "../assets/score.glyphs.js",
  "../assets/score.key.js",
  "../assets/score.tempo.js",
  "../assets/score.measure.js",
  "../assets/score.meter.js",
  "../assets/score.part.js",
  "../assets/score.staff.js",
  "../assets/score.bar.js",
  "../assets/score.chord.js",
  "../assets/score.grace.js",
  "../assets/score.slur.js",
  "../assets/score.tuplet.js",
  "../assets/score.note.js",
  "../assets/score.rest.js",
  "../assets/score.chord.js",
  "../assets/score.midiwriter.js",
  "../assets/score.abc.js",

  "../rules/constraints.js",
  "../rules/1st_species.js"
);

onmessage = function(message) {
  var score = Score.parseABC(message.data);
  var futures = Gradus.FirstSpecies.elaborate(score);

  var chords = [];
  var counterpoint = score.parts[0];
  counterpoint.findAll('Rest').forEach(function(rest, irest) {
    var pitches = {};
    var bass = counterpoint.below(rest);
    futures.forEach(function(future) {
      pitches[future[irest]] = true;
    });

    var chord = [];
    for (var pitch in pitches)
      chord.push(pitch);
    chords.push(chord);
  });

  postMessage(chords);
};


Gradus = {};

importScripts(
  "../score/score.js",
  "../score/score.staff_element.js",
  "../score/score.tickable.js",
  "../score/score.set.js",

  "../score/score.glyph.js",
  "../score/score.break.js",
  "../score/score.format.js",
  "../score/score.glyphs.js",
  "../score/score.key.js",
  "../score/score.tempo.js",
  "../score/score.measure.js",
  "../score/score.meter.js",
  "../score/score.part.js",
  "../score/score.staff.js",
  "../score/score.bar.js",
  "../score/score.chord.js",
  "../score/score.grace.js",
  "../score/score.slur.js",
  "../score/score.tuplet.js",
  "../score/score.note.js",
  "../score/score.rest.js",
  "../score/score.chord.js",
  "../score/score.midiwriter.js",
  "../score/score.abc.js",

  "../rules/constraints.js",
  "../rules/theory.js",
  "../rules/theory.1st_species.js"
);

onmessage = function(message) {
  var score = Score.parseABC(message.data);
  var parts = Gradus.FirstSpecies.prepare(score);
  var futures = Gradus.FirstSpecies.elaborate(parts);

  var chords = [];
  var counterpoint = score.part('Counterpoint');
  counterpoint.findAll('Rest').forEach(function(rest, irest) {
    var pitches = {};
    var bass = counterpoint.below(rest);
    futures.forEach(function(future) {
      pitches[future[irest]] = true;
    });

    var chord = [];
    for (var p in pitches)
      chord.push(Score.Note.ordToPitch(pitch(p), true))
    chords.push(chord);
  });

  postMessage(chords);
};

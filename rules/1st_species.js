
var Violation = Gradus.Constraints.Violation;
Gradus.FirstSpecies = new Gradus.Constraints();
Gradus.FirstSpecies.rules = [
  // Must contain only consonances
  function(score) {
    var cf = score.part('Cantus Firmus');
    cf.findAll('Note').forEach(function(note) {
      var counterpoint = cf.above(note);
      if (counterpoint.type != 'Note')
        return;
      var interval = note.interval(counterpoint);
      if (!interval.consonant)
        throw new Violation('All intervals must be consonant', counterpoint);
    });
  },

  // Must start with and end with perfect consonance
  function(score) {
    var cf = score.part('Cantus Firmus');
    var notes = cf.findAll('Note');

    var first = notes.shift();
    var counterpoint = cf.above(first);
    if (counterpoint.type != 'Note')
      return;
    var interval = first.interval(counterpoint);
    if (!(interval.perfect && interval.consonant))
      throw new Violation('Must start with a perfect consonance', counterpoint);

    var last = notes.pop();
    counterpoint = cf.above(first);
    if (counterpoint.type != 'Note')
      return;
    interval = last.interval(counterpoint);
    if (!(interval.perfect && interval.consonant))
      throw new Violation('Must end with a perfect consonance', counterpoint);
  },

  // Must not be unison anywhere else
  function(score) {
    var cf = score.part('Cantus Firmus');
    var notes = cf.findAll('Note');

    notes.shift();
    notes.pop();

    notes.forEach(function(note) {
      var counterpoint = cf.above(note);
      if (counterpoint.type != 'Note')
        return;
      var interval = note.interval(counterpoint);
      if (interval.semitones == 0)
	throw new Violation("Must not be unison except on first and last notes",
                            counterpoint);
    });
  },

  // Must establish mode clearly at the start
  // "we start on the tonic and should reinforce the tonic"
  function() { },

  // Must not travel by tritone
  function(score) {
    var counterpoint = score.parts[0];

    var interval;
    var prev = counterpoint.find('Note');
    if (!prev)
      return;
    var curr = prev.findNext('Note');
    while (curr) {
      interval = prev.interval(curr);
      if (interval.tritone)
        throw new Violation('Must not travel by tritone', curr);
      prev = curr;
      curr = curr.findNext('Note');
    }
  },

  // Must not travel by major sixth
  function(score) {
    var counterpoint = score.parts[0];

    var interval;
    var prev = counterpoint.find('Note');
    if (!prev)
      return;
    var curr = prev.findNext('Note');
    while (curr) {
      interval = prev.interval(curr);
      if (interval.semitones == 9)
        throw new Violation('Must not travel by major sixth', curr);
      prev = curr;
      curr = curr.findNext('Note');
    }
  },

  // Must not move by parallel motion into perfect consonance
  function(score) {
    var cf = score.part('Cantus Firmus');
    var counterpoint = score.parts[0];
    var intervals = intervalSequence(cf, counterpoint);
    for (var i=0; i < intervals.length; ++i) {
      if (intervals[i].motion != 'parallel')
        continue;
      if (intervals[i].destination.perfect && intervals[i].destination.consonant)
        throw new Violation('Parallel motion must not result in a perfect consonance',
                            intervals[i].notes[1], intervals[i].destination.notes[1]);
    }
  },

  // Should not battuta (contract from 10th to 8ve stepwise)
  function() { },

  // Should not leap to an octave consonance from a more "remote" consonance
  function() { },

  // Should not travel stepwise for a total of a tritone
  function() { },

  // Second to last note MUST be a major sixth (?)
  function() { }
];


function intervalSequence(bass, counterpoint) {
  var above, below;
  above = counterpoint.find('Tickable');

  var events = [];
  while (above) {
    below = above.measure.part.below(above);
    if (above.type == 'Note' && below.type == 'Note')
      events.push([below, above]);
    above = above.findNext('Tickable');
  }

  for (var n1, n2, i=0; i < events.length; ++i) {
    n1 = events[i][0].findNext('Tickable');
    n2 = events[i][1].findNext('Tickable');
    if (!n1 || !n2 || n1.type != 'Note' || n2.type != 'Note')
      events.splice(i, 1);
  }

  var intervals = [];
  for (var interval, n1, n2, m1, m2, i=0; i < events.length; ++i) {
    below = events[i][0];
    above = events[i][1];
    n1 = below.findNext('Note');
    n2 = above.findNext('Note');
    m1 = below.motion(n1);
    m2 = above.motion(n2);
    interval = below.interval(above);
    interval.destination = n1.interval(n2);
    if (m1 == m2)
      interval.motion = 'parallel';
    else if (m1 != 'none' && m2 != 'none')
      interval.motion = 'contrary';
    else
      interval.motion = 'oblique';
    intervals.push(interval);
  }

  return intervals;
};

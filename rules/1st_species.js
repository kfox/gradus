
var Violation = Gradus.Constraints.Violation;
Gradus.FirstSpecies = new Gradus.Constraints();
Gradus.FirstSpecies.rules = [
  // Must contain only consonances
  function(score) {
    var cf = score.part('Cantus Firmus');
    var notes = cf.findAll('Note');
    for (var note, i=0; i < notes.length; ++i) {
      note = notes[i];
      var counterpoint = cf.above(note);
      if (counterpoint.type != 'Note')
        continue;
      var interval = note.interval(counterpoint);
      if (!interval.consonant)
        return new Violation('All intervals must be consonant', counterpoint);
    }
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
      return new Violation('Must start with a perfect consonance', counterpoint);

    var last = notes.pop();
    counterpoint = cf.above(last);
    if (counterpoint.type != 'Note')
      return;
    interval = last.interval(counterpoint);
    if (!(interval.perfect && interval.consonant))
      return new Violation('Must end with a perfect consonance', counterpoint);
  },

  // Must not be unison anywhere else
  function(score) {
    var cf = score.part('Cantus Firmus');
    var notes = cf.findAll('Note');

    notes.shift();
    notes.pop();

    for (var note, i=0; i < notes.length; ++i) {
      note = notes[i];
      var counterpoint = cf.above(note);
      if (counterpoint.type != 'Note')
        continue;
      var interval = note.interval(counterpoint);
      if (interval.semitones == 0)
	return new Violation("Must not be unison except on first and last notes",
                            counterpoint);
    }
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
        return new Violation('Must not travel by tritone', curr);
      prev = curr;
      curr = curr.findNext('Note');
    }
  },

  // Must not travel by more than a minor sixth
  function(score) {
    var counterpoint = score.parts[0];

    var interval;
    var prev = counterpoint.find('Note');
    if (!prev)
      return;
    var curr = prev.findNext('Note');
    while (curr) {
      interval = prev.interval(curr);
      if (interval.semitones >= 9)
        return new Violation('Must not travel by more than a minor sixth', curr);
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
        return new Violation('Parallel motion must not result in a perfect consonance',
                            intervals[i].notes[1], intervals[i].destination.notes[1]);
    }
  },

  // Total range must not exceed a tenth
  function(score) {
    var counterpoint = score.parts[0];
    var notes = counterpoint.findAll('Note');
    if (!notes.length)
      return;

    var low, high, lowOrd, highOrd;
    low = high = notes[0];
    lowOrd = highOrd = notes[0].ord(true);
    for (var ord, i=1; i < notes.length; ++i) {
      ord = notes[i].ord(true);
      if (ord < lowOrd) {
        lowOrd = ord;
        low = notes[i];
      } else if (ord > highOrd) {
        highOrd = ord;
        high = notes[i];
      }
    }

    if (16 < highOrd - lowOrd)
      return new Violation('Total range of voice must not exceed a tenth', low, high);
  },


  // Should not battuta (contract from 10th to 8ve stepwise)
  function() { },

  // Should not leap to an octave consonance from a more "remote" consonance
  function() { },

  // Should not travel stepwise for a total of a tritone
  function() { },

  // Second to last note MUST be a major sixth (?)
  function(score) {
    var cf = score.part('Cantus Firmus');
    var counterpoint = score.parts[0];
    var note, notes = cf.findAll('Note');
    note = notes[notes.length-2];

    var above = cf.above(note);
    if (!above || above.type != 'Note')
      return;

    var semitones = note.interval(above).normalizedSemitones;
    if (note.ord(true) < above.ord(true)) {
      if (semitones != 9 && semitones != 8) // alow minor 6th just for now
        return new Violation('Second to last note must create a major 6th', above);
    } else {
      if (note.interval(above).normalizedSemitones != 3)
        return new Violation('Second to last note must create a minor 3rd', above);
    }
  }
];


function intervalSequence(bass, counterpoint) {
  var above, below;
  above = counterpoint.find('Tickable');

  var events = [];
  while (above) {
    below = above.measure.part.below(above);
    if (above.type == 'Note' && below.type == 'Note')
      events.push([below, above]);
    above = above.findNext(['Note', 'Rest']);
  }

  for (var n1, n2, i=0; i < events.length; ++i) {
    n1 = events[i][0].findNext(['Note', 'Rest']);
    n2 = events[i][1].findNext(['Note', 'Rest']);
    if (!n1 || !n2 || (n1.type != 'Note') || (n2.type != 'Note'))
      events.splice(i--, 1);
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

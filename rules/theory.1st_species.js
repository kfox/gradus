
var Violation = Gradus.Constraints.Violation;
Gradus.FirstSpecies = new Gradus.Constraints();

// Return a first guess at which notes could go on top of
// a cf, in place of a rest
Gradus.FirstSpecies.naiveSonorities = function(bass, rest, prev) {
  var notes = [];
  var offsets = consonances(bass);
  for (var i=0; i < offsets.length; ++i)
    notes.push(translate(bass, offsets[i]));

  notes.push(translate(bass, 12));
  notes.push(translate(bass, -12));
  notes.push(translate(bass, 12+offsets[1]));
  notes.push(translate(bass, -12+offsets[2]));

  if (prev) {
    // Short-cut the check for travel by tritone or >= major sixth
    for (var ival, i=0; i < notes.length; ++i) {
      ival = interval(prev, notes[i]);
      if (tritone(ival) || ival >= 9)
        notes.splice(i--, 1);
    }
  }

  return notes;
};

Gradus.FirstSpecies.rules = [
  // Must contain only consonances
  function(cf, cp) {
    for (var i=0; i < cf.length; ++i) {
      if (rest(cp[i]))
        continue;
      if (!consonant(interval(cf[i], cp[i])))
        return new Violation('All intervals must be consonant', {cf: [i], cp: [i]});
    }
  },

  // Must start with and end with perfect consonance
  function(cf, cp) {
    if (!rest(cp[0]) && !perfect(interval(cf[0], cp[0])))
      return new Violation('Must start with a perfect consonance',
                           {cf: [0], cp: [0]});

    var i = cf.length-1;
    if (!rest(cp[i]) && !perfect(interval(cf[i], cp[i])))
      return new Violation('Must end with a perfect consonance', {cf: [i], cp: [i]});
  },

    // Must not be unison anywhere else
  function(cf, cp) {
    for (var i=1; i < cf.length-1; ++i) {
      if (rest(cp[i]))
        continue;
      if (unison(interval(cf[i], cp[i])))
        return new Violation("Must not be unison except on first and last notes",
                             {cf: [i], cp: [i]});
    }
  },

  // Must not travel by tritone or by more than a minor sixth
  function(cf, cp) {
    var pairs = adjacencies(cp);
    for (var ival, i=0; i < pairs.length; ++i) {
      ival = Math.abs(interval(pairs[i][0], pairs[i][1]));
      if (tritone(ival))
        return new Violation('Must not travel by tritone',
                             {cp: [i, i+1]});
      else if (ival > 8)
        return new Violation('Must not travel by more than a minor sixth',
                             {cp: [i, i+1]});
    }
  },

  // Must not move by parallel motion into perfect consonance
  function(cf, cp) {
    for (var i=1; i < cf.length; ++i) {
      if (rest(cf[i-1]) || rest(cp[i-1]))
        continue;
      if (rest(cf[i]) || rest(cp[i]))
        continue;

      if (((pitch(cf[i-1]) < pitch(cf[i]) && pitch(cp[i-1]) < pitch(cp[i])) ||
           (pitch(cf[i-1]) > pitch(cf[i]) && pitch(cp[i-1]) > pitch(cp[i]))) &&
          perfect(interval(cf[i], cp[i]))) {
        return new Violation('Parallel motion must not move into perfect consonance',
                             {cf: [i-1, i], cp: [i-1, i]});
      }
    }
  },

  // Total range must not exceed a tenth
  function(cf, cp) {
    if (16 < range(cp))
      return new Violation('Total range of voice must not exceed a tenth');
  },

  // Second to last note MUST be a major sixth (?)
  function(cf, cp) {
    var n1 = cf[cf.length-2];
    var n2 = cp[cp.length-2];
    var ival = interval(n2, n1);
    if (!n1 || !n2 || rest(n1) || rest(n2))
      return;
    if (ival != 9 && ival != 8)
      return new Violation('Second to last note must create a major 6th',
                           {cp: [cp.length-1]});
  }

];

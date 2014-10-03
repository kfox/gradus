Gradus.Constraints = function() {
  this.violations = [];
};

Gradus.Constraints.Violation = function(message, elements) {
  this.message = message;
  this.elements = elements || {};
  this.elements.cf = this.elements.cf || [];
  this.elements.cp = this.elements.cp || [];
};

Gradus.Constraints.prototype.prepare = function(score) {
  var cf = score.part('Cantus Firmus');
  var cp = score.parts[0];
  cp = cp.findAll(['Note', 'Rest', 'Chord']);
  cf = cf.findAll(['Note', 'Rest', 'Chord']);

  for (var i=0; i < cf.length; ++i)
    cf[i] = noteToUInt32(cf[i]);
  for (var i=0; i < cp.length; ++i)
    cp[i] = noteToUInt32(cp[i]);

  return [cf, cp];
}

Gradus.Constraints.prototype.check = function(cf, cp) {
  var violations = [];
  for (var error, i=0; i < this.rules.length; ++i) {
    if ((error = this.rules[i].call(this, cf, cp)))
      violations.push(error);
  }

  if (violations.length)
    return [false, violations];
  return [true, violations];
};

Gradus.Constraints.prototype.elaborate = function(cf, cp, iprev) {
  // If the score is already invalid, there are no possible
  // notes in the future
  if (!this.check(cf, cp)[0])
    return [];

  var restIndex = -1;
  for (var i = iprev || 0; i < cp.length; ++i)
    if (rest(cp[i])) {
      restIndex = i;
      break;
    }

  // Since the score is valid, if there are no more rests to fill in,
  // the only valid future "elaboration" is empty
  if (restIndex == -1)
    return [[]];

  // Possible notes which could go in place of the next rest
  var futures = [];
  var cfNote = cf[restIndex];
  var theRest = cp[restIndex];
  var possibilities = this.naiveSonorities(cfNote, rest, cp[iprev]);
  for (var i=0; i < possibilities.length; ++i) {
    cp[restIndex] = possibilities[i];
    this.elaborate(cf, cp, restIndex).forEach(function(set) {
      set.unshift(possibilities[i]);
      futures.push(set);
    });
    cp[restIndex] = theRest;
  }

  return futures;
};

Gradus.Constraints.prototype.notify = function(score, container) {
  var parts = this.prepare(score);
  var result = this.check(parts[0], parts[1]);
  var violations = this.violations;
  container.empty();

  violations.forEach(function(violation) {
    violation.elements.cf.forEach(function(i) {
      var v = score.part('Cantus Firmus');
      v.measures[i].elements.forEach(function(e) {
        e.type == 'Note' && e.avatar && e.avatar.fill('#000');
      });
    });

    violation.elements.cp.forEach(function(i) {
      var v = score.parts[0];
      v.measures[i].elements.forEach(function(e) {
        e.type == 'Note' && e.avatar && e.avatar.fill('#000');
      });
    });
  });
  violations.splice(0);

  if (!result[0]) {
    container.append('<ul/>');
    result[1].forEach(function(violation) {
      violation.elements.cf.forEach(function(i) {
        var v = score.part('Cantus Firmus');
        v.measures[i].elements.forEach(function(e) {
          e.type == 'Note' && e.avatar && e.avatar.fill('#f00');
        });
      });

      violation.elements.cp.forEach(function(i) {
        var v = score.parts[0];
        v.measures[i].elements.forEach(function(e) {
          e.type == 'Note' && e.avatar && e.avatar.fill('#f00');
        });
      });
      violations.push(violation);
      container.find('ul').append($('<li/>').text(violation.message));
    });
  }
};

Gradus.Constraints.prototype.adjacentCounterpointNotes = function(score) {
  var counterpoint = score.parts[0];

  var prev = counterpoint.find('Note');
  var curr = prev && prev.findNext(['Note', 'Rest']);

  if (!prev)
    return [];

  var pairs = [];
  while (curr) {
    if (prev.type == 'Note' && curr.type == 'Note')
      pairs.push([prev, curr]);
    prev = curr;
    curr = curr.findNext(['Note', 'Rest']);
  }

  return pairs;
};

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
  var parts = new Score.Theory.Score();

  var cf, cp, cfOnTop;
  cf = score.part('Cantus Firmus');
  cp = score.part('Counterpoint');
  cfOnTop = (cf == score.parts[0]);

  cp = cp.findAll(['Note', 'Rest', 'Chord']);
  cf = cf.findAll(['Note', 'Rest', 'Chord']);

  for (var i=0; i < cf.length; ++i)
    parts.cf[i] = noteToUInt32(cf[i]);
  for (var i=0; i < cp.length; ++i)
    parts.cp[i] = noteToUInt32(cp[i]);

  parts.cantusFirmusOnTop = cfOnTop;

  return parts;
}

// TODO:
//   Don't need to check harmonic rules over and over
//   Maybe pass in a 3rd argument
//     function(cf, cp, i){
//   Rule is *allowed* to only check itself starting at `i`
Gradus.Constraints.prototype.check = function(parts) {
  var violations = [];
  for (var error, i=0; i < this.rules.length; ++i) {
    if ((error = this.rules[i].call(this, parts)))
      violations.push(error);
  }

  if (violations.length)
    return [false, violations];
  return [true, violations];
};

Gradus.Constraints.prototype.elaborate = function(parts, iprev) {
  // If the score is already invalid, there are no possible
  // notes in the future
  if (!this.check(parts)[0])
    return [];

  var cf = parts.cf, cp = parts.cp;

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
  var possibilities = this.naiveSonorities(cfNote, rest, cp[iprev],
                                          restIndex == cp.length-2);
  for (var i=0; i < possibilities.length; ++i) {
    cp[restIndex] = possibilities[i];
    this.elaborate(parts, restIndex).forEach(function(set) {
      set.unshift(possibilities[i]);
      futures.push(set);
    });
    cp[restIndex] = theRest;
  }

  return futures;
};

Gradus.Constraints.prototype.notify = function(score, container) {
  var parts = this.prepare(score);
  var result = this.check(parts);
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
      var v = score.part('Counterpoint');
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
        var v = score.part('Counterpoint');
        v.measures[i].elements.forEach(function(e) {
          e.type == 'Note' && e.avatar && e.avatar.fill('#f00');
        });
      });
      violations.push(violation);
      container.find('ul').append($('<li/>').text(violation.message));
    });
  }
};

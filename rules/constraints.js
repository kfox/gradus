Gradus.Constraints = function() {
  this.violations = [];
};
Gradus.Constraints.Violation = function(message) {
  this.message = message;
  this.elements = Array.prototype.slice.call(arguments, 1);
};

Gradus.Constraints.prototype.check = function(score) {
  var violations = [];
  for (var i=0; i < this.rules.length; ++i) {
    try {
      this.rules[i](score);
    } catch(e) {
      if (e.constructor != Gradus.Constraints.Violation)
        throw e;
      violations.push(e);
    }
  }

  if (violations.some(function(v){ return v.message.match(/must/i) }))
    return [false, violations];

  return [true, violations];
};

Gradus.Constraints.prototype.elaborate = function(score) {
  // If the score is already invalid, there are no possible
  // notes in the future
  if (!this.check(score)[0])
    return [];

  var counterpoint = score.parts[0];
  var cf = score.part('Cantus Firmus');
  var rest = counterpoint.find('Rest');

  // Since the score is valid, if there are no more rests to fill in,
  // the only valid future "elaboration" is empty
  if (!rest)
    return [[]];

  // Possible notes which could go in place of the next rest
  var possibilities = [];
  var bass = counterpoint.below(rest);
  for (var i=-10; i <= 10; ++i)
    possibilities.push(
      new Score.Note({
        pitch: Score.Note.ordToPitch(bass.ord()+i),
        value: rest.opts.value
      })
    );

  var futures = [];
  for (var future, i=0; i < possibilities.length; ++i) {
    rest.measure.replace(rest, possibilities[i], false);
    future = this.elaborate(score);
    possibilities[i].measure.replace(possibilities[i], rest, false);

    future.forEach(function(set) {
      set.unshift(possibilities[i].opts.pitch);
      futures.push(set);
    });
  }

  return futures;
};

Gradus.Constraints.prototype.notify = function(score, container) {
  var result = this.check(score);
  var violations = this.violations;
  container.empty();

  violations.forEach(function(violation) {
    violation.elements.forEach(function(note) {
      note.avatar.fill('#000');
    });
  });
  violations.splice(0);

  if (!result[0]) {
    container.append('<ul/>');
    result[1].forEach(function(violation) {
      violation.elements.forEach(function(note) {
        note.avatar.fill('#f00');
      });
      violations.push(violation);
      container.find('ul').append($('<li/>').text(violation.message));
    });
  }
};

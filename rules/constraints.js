Gradus.Constraints = function() {
  this.violations = [];
};
Gradus.Constraints.Violation = function(message) {
  this.message = message;
  this.elements = Array.prototype.slice.call(arguments, 1);
};

Gradus.Constraints.prototype.check = function(score) {
  var violations = [];
  for (var error, i=0; i < this.rules.length; ++i) {
    if ((error = this.rules[i](score)))
      violations.push(error);
  }

  if (violations.length)
    return [false, violations];
  return [true, violations];
};

Gradus.Constraints.prototype.elaborate = function(score, prev) {
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
  var bass = counterpoint.below(rest);
  var possibilities = this.naiveSonorities(bass, rest, prev);
  var futures = [];
  for (var future, i=0; i < possibilities.length; ++i) {
    rest.measure.replace(rest, possibilities[i], false);
    future = this.elaborate(score, possibilities[i]);
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

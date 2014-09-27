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

Gradus.Constraints.prototype.notify = function(score, container) {
  var result = this.check(score);
  var violations = this.violations;
  container.empty();
  if (result[0]) {
    violations.forEach(function(violation) {
      violation.elements.forEach(function(note) {
        note.avatar.fill('#000');
      });
    });
    violations.splice(0);
  } else {
    violations.splice(0);
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

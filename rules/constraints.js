Gradus.Constraints = function(){};
Gradus.Constraints.Violation = function(message, e) {
    this.message = message;
    this.element = e;
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

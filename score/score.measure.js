
Score.Measure = function(voice) {
    this.elements = [];
    this.part = voice;
};

Score.Measure.prototype.push = function(x) {
    x.measure = this;
    this.elements.push(x);
};

Score.Measure.prototype.replace = function(el, newel) {
    for (var i=0; i < this.elements.length; ++i) {
        if (this.elements[i].avatar) {
            this.elements[i].avatar.remove();
            this.elements[i].avatar = null;
        }
    }

    var index = this.elements.indexOf(el);
    newel.measure = this;
    newel.part = el.part;
    newel.score = el.score;
    newel.prev = el.prev;
    newel.next = el.next;
    if (newel.prev)
        newel.prev.next = newel;
    if (newel.next)
        newel.next.prev = newel;

    this.elements[index] = newel;
    this.prerender(svg0, this.renderYOffset);
    this.part.score.reformatLine(this.renderLineNumber, this.renderXOffset);
};

// Return a new measure, with the elements of this measure
// filtered to only a specific type
Score.Measure.prototype.filter = function(type) {
    var set = new Score.Measure();
    for (var i = 0; i < this.elements.length; ++i)
        if (this.elements[i].isA(type))
            set.push(this.elements[i]);
    return set;
};

Score.Measure.prototype.renderBeams = function(svg) {
    for (var start, end, i=0; i < this.elements.length; ++i) {
        if (this.elements[i].type != 'Note')
            continue;
        if (this.elements[i].isBeamStart(true)) {
            start = this.elements[i];
            end = start.beamEnd();
            Glyph.Note.beam(svg, start, end);
        }
    }
};

Score.Measure.prototype.prerender = function(svg, yoffset) {
    this.renderYOffset = yoffset;
    for (var i=0; i < this.elements.length; ++i)
        this.elements[i].render(svg, 0, yoffset);
};


Score.Measure = function() {
    this.elements = [];
};

Score.Measure.prototype.push = function(x) {
    this.elements.push(x);
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
    for (var i=0; i < this.elements.length; ++i)
        this.elements[i].render(svg, 0, yoffset);
};

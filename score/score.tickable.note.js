Score.Note = function(opts) {
    this.opts = opts;
};
Score.Note.prototype = new Score.Tickable();
Score.Note.prototype.type = 'Note';

Score.Note.prototype.ord = function(chromatic) {
    // Middle C = 21
    var mdata, shift = 0;
    var octshift = chromatic ? 12 : 7;
    var note = this.opts.pitch.match(/([A-Ga-g][,']*)/)[1];
    while((mdata = note.match(/[,']/))) {
        note = note.replace(/[,']/, '');
        shift += (mdata[0] == ',') ? -octshift : octshift;
    }
    var key = note.match(/[A-Ga-g]/);
    var bases;
    if (chromatic)
        bases = {
            'C': 21, 'D': 23, 'E': 25, 'F': 26, 'G': 28, 'A': 30, 'B': 32,
            'c': 33, 'd': 35, 'e': 37, 'f': 38, 'g': 40, 'a': 42, 'b': 44
        };
    else
        bases = {
            'C': 21, 'D': 22, 'E': 23, 'F': 24, 'G': 25, 'A': 26, 'B': 27,
            'c': 28, 'd': 29, 'e': 30, 'f': 31, 'g': 32, 'a': 33, 'b': 34
        };
    return bases[key] + shift;
};

Score.Note.prototype.glyphValue = function() {
    var ticks = this.ticks();
    var glyphValue = undefined;
    if (ticks >= Score.SEMIBREVE)
        glyphValue = 'whole';
    else if (ticks >= Score.MINIM)
        glyphValue = 'half';
    else if (ticks >= Score.CROCHET)
        glyphValue = 'quarter';
    else if (ticks >= Score.QUAVER || ticks == Score.QUAVER_TRIPLET)
        glyphValue = 'eighth';
    else if (ticks >= Score.SEMIQUAVER || ticks == Score.SEMIQUAVER_TRIPLET)
        glyphValue = 'sixteenth';
    return glyphValue;
};

Score.Note.prototype.isDotted = function() {
    var swing = this.opts.swing;
    switch(this.opts.value) {
    case '/2':
    case '1':
    case '2':
    case '4':
    case '8':
        return swing;
    default:
        return true;
    }
};

Score.Note.prototype.flags = function() {
    switch(this.glyphValue()) {
    case 'whole':
    case 'half':
    case 'quarter':
        return 0;
    case 'eighth':
        return 1;
    case 'sixteenth':
        return 2;
    }
};

Score.Note.prototype.isBeamed = function() {
    if (this.opts.beam)
        return true;

    var next = this.findPrev('Tickable');
    return next && next.opts.beam;
};

Score.Note.prototype.isBeamStart = function(strict) {
    var next = this.findNext('Tickable', {neighbor: true});
    var beamed = this.opts.beam && next && next.type == 'Note';
    if (strict) {
        var prev = this.findPrev('Tickable', {neighbor: true});
        return beamed && (!prev || !prev.opts.beam);
    }
    return beamed;
};

Score.Note.prototype.beamNext = function() {
    if (!this.opts.beam)
        return null;
    var next = this.findNext('Tickable', {neighbor: true});
    return next && next.type == 'Note' && next;
};

Score.Note.prototype.beamEnd = function() {
    if (!this.opts.beam)
        return this;
    var next = this.findNext('Tickable', {neighbor: true});
    return next ? (next.type == 'Note' ? next.beamEnd() : this) : this;
};

Score.Note.prototype.isSharp = function() {
    return this.opts.accidentals.indexOf('^') != -1;
};

Score.Note.prototype.isFlat = function() {
    return this.opts.accidentals.indexOf('_') != -1;
};

Score.Note.prototype.isNatural = function() {
    return this.opts.accidentals.indexOf('=') != -1;
};

Score.Note.prototype.render = function(svg, x, y) {
    var position = this.part.place(this);
    y = y + position * Score.Staff.LINE_HEIGHT / 2;

    var ball = Glyph.Note.render(svg, this.glyphValue(), {
        sharp: this.isSharp(),
        noflags: this.isBeamed(),
        ledger: (position < 0 || position > 8) ? (position % 2) : undefined,
        dot: this.isDotted()
    });

    ball.move(x+Score.Staff.LINE_HEIGHT/2, y,
              Score.Staff.LINE_HEIGHT/2);

    this.avatar = ball;
};

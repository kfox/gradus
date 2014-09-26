
function Score() {
    this.parts = [];
};

Score.prototype.part = function(id) {
    for (var i=0; i < this.parts.length; ++i)
        if (this.parts[i].id == id)
            return this._part = this.parts[i];

    this._part = new Score.Part();
    this.parts.push(this._part);
    this._part.score = this;
    this._part.id = id;

    return this._part;
};

Score.prototype.countStaves = function() {
    return this.parts[0].findAll('Break').length;
};

Score.prototype.getAllStaves = function(line) {
    var set = [];
    for (var staff, j=0; j < this.parts.length; ++j)
        if ((staff = this.parts[j].line(line)))
            set.push([this.parts[j], staff]);
    return set;
};

Score.prototype.render = function(container, options) {
    $(container).css('width', '1000px').empty();

    var svg = SVG(container);
    svg.size($(container).width(), 1600);
    svg0 = svg;

    var yoffset = 64;
    var nstaves = this.countStaves();
    for (var set, i=0; i < nstaves; ++i) {
        set = this.getAllStaves(i);
        for (var j=0; j < set.length; ++j)
            for (var k=0; k < set[i][1].length; ++k)
                set[j][1][k].renderLineNumber = i;
        yoffset = Score.Part.renderAll(svg, set, yoffset);
        yoffset += Score.Staff.VERTICAL_PADDING/2;
    }

    var self = this;
    var events = this.eventListeners = options.events || {};
    svg.mouseup(function(e) {
        if (events['score.mouseup'])
            events['score.mouseup'].call(self, e);
    });
    svg.mousemove(function(e) {
        if (events['score.mousemove'])
            events['score.mousemove'].call(self, e);
    });
};

Score.prototype.reformatLine = function(n, x) {
    var voices = this.getAllStaves(n);
    for (var i=0; i < voices.length; ++i)
        voices[i] = $.map(voices[i][1], function(x){ return x.elements });
    new Score.Formatter(voices).format(x);
};

Score.prototype.parseABC = function(abc) {
    var parser, elements, staff;
    var line, lines = $.trim(abc).split(/\n+/);
    for (var i=0; i < lines.length; ++i) {
        lines[i] = $.trim(lines[i]);
        if (!lines[i].length)
            lines.splice(i,1);
    }

    this.key = Score.Key.parse('CMaj');
    this.meter = new Score.Meter(4, 4);
    while (true) {
        line = lines.shift();
        if (!(elements = line.match(/[CTKLM]:(.+)/))) {
            lines.unshift(line);
            break;
        }

        var value = elements[1];
        value = value.replace(/^\s*/, '').replace(/\s*$/, '');
        switch(line[0].toUpperCase()) {
        case 'T':
            this.title = value;
            break;
        case 'C':
            this.composer = value;
            break;
        case 'K':
            this.key = Score.Key.parse(value);
            break;
        case 'L':
            switch(value) {
            case '1/4':
                this.unitNoteValue = Score.CROCHET;
                break;
            case '1/8':
                this.unitNoteValue = Score.QUAVER;
                break;
            case '1/16':
                this.unitNoteValue = Score.SEMIQUAVER;
                break;
            default:
                throw "Invalid unit note length = "+value;
            }
            break;
        case 'M':
            if (value.match(/\d\/\d/))
                this.meter = new Score.Meter(value.match(/(\d)\/\d/)[1],
                                             value.match(/\d\/(\d)/)[1]);
            break;
        }
        if (!this.unitNoteValue) {
            if (this.meter.beatsPerMeasure / this.meter.beatValue < 0.75)
                this.unitNoteValue = Score.SEMIQUAVER;
            else
                this.unitNoteValue = Score.QUAVER;
        }
    }

    var part;
    for (var i=0; i < lines.length; ++i) {
        if (lines[i].substr(0,2) == 'V:') {
            part = this.part(lines[i].substr(2));
            continue;
        }
        if ((elements = lines[i].match(/\[V:([^\]]+)\]/))) {
            part = this.part($.trim(elements[1]));
            lines[i] = $.trim(lines[i]).substr(elements[0].length);
        }

        if (!this.parts.length)
            part = this.part();

        parser = new ABCLineParser(lines[i]);
        elements = parser.parse();

        for (var j=0; j < elements.length; ++j) {
            switch(elements[j].type) {
            case 'note':
                part.note(elements[j]);
                break;
            case 'rest':
                part.rest(elements[j]);
                break;
            case 'bar':
            case 'repeat_begin':
            case 'nth_ending_begin':
            case 'repeat_end':
                part.bar();
                break;
            case 'tuplet_begin':
                part.beginTuplet();
                break;
            case 'tuplet_end':
                part.endTuplet();
                break;
            case 'slur_begin':
                part.beginSlur();
                break;
            case 'slur_end':
                part.endSlur();
                break;
            case 'grace_begin':
                part.beginGrace();
                break;
            case 'grace_end':
                part.endGrace();
                break;
            case 'chord_begin':
                part.beginChord();
                break;
            case 'chord_end':
                part.endChord();
                break;
            }
        }
        part.add(new Score.Break());
    }
    return this;
};

Score.parseABC = function(abc) {
    return new Score().parseABC(abc);
};

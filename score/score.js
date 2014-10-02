
function Score() {
  this.parts = [];
  this.setTempo('1/4=120');
  this.setKey('CMaj');
  this.setMeter('4/4');
};

function trim(str) {
  return str.replace(/^\s+/g, '').replace(/\s+$/, '');
}

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

  var svg = this.svg = SVG(container);
  var nstaves = this.countStaves();
  var nvoices = this.parts.length;
  var requiredHeight = Score.Staff.HEIGHT + Score.Staff.VERTICAL_PADDING;
  requiredHeight *= (nstaves * nvoices) + 1;
  svg.size($(container).width(), requiredHeight);
  svg0 = svg;

  this.options = options;

  var yoffset = 64;
  for (var set, i=0; i < nstaves; ++i) {
    set = this.getAllStaves(i);
    for (var j=0; j < set.length; ++j)
      for (var k=0; k < set[i][1].length; ++k)
        set[j][1][k].renderLineNumber = i;
    yoffset = Score.Part.renderAll(svg, set, yoffset);
    yoffset += Score.Staff.VERTICAL_PADDING/2;
  }

  var self = this;
  var events = this.eventListeners = this.options.events || {};
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
  var voices = this.getAllStaves(n), set = [];
  for (var i=0; i < voices.length; ++i)
    set.push($.map(voices[i][1], function(x){ return x.elements }));

  new Score.Formatter(set, this.svg.width()-x).format(x);

  for (var i=0; i < voices.length; ++i) {
    for (var j=0; j < voices[i][1].length; ++j) {
      voices[i][1][j].avatar.remove();
      voices[i][1][j].render(svg0);
    }
  }

};

Score.prototype.setTempo = function(value) {
  this.tempo = new Score.Tempo(value);
};

Score.prototype.setKey = function(value) {
  this.key = Score.Key.parse(value);
};

Score.prototype.setMeter = function(value) {
  var match = value.match(/(\d)\/(\d)/);
  this.meter = new Score.Meter(parseInt(match[1]), parseInt(match[2]));
};

Score.prototype.parseABC = function(abc) {
  var parser, elements, staff;
  var line, lines = trim(abc).split(/\n+/);
  for (var i=0; i < lines.length; ++i) {
    lines[i] = trim(lines[i]);
    if (!lines[i].length)
      lines.splice(i--, 1);
  }

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
    case 'Q':
      this.setTempo(value);
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
      part = this.part(trim(elements[1]));
      lines[i] = trim(lines[i]).substr(elements[0].length);
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

Score.prototype.toABC = function() {
  var abc = '';

  abc += "K: "+this.key.names[0]+"\n";

  switch(this.unitNoteValue) {
  case Score.CROCHET:
    abc += "L: 1/4\n";
    break;
  case Score.QUAVER:
    abc += "L: 1/8\n";
    break;
  case Score.SEMIQUAVER:
    abc += "L: 1/16\n";
    break;
  }

  abc += "M: "+this.meter.beatsPerMeasure+'/'+this.meter.beatValue+"\n";

  var nstaves = this.countStaves();
  for (var set, i=0; i < nstaves; ++i) {
    set = this.getAllStaves(i);
    for (var measures, j=0; j < set.length; ++j) {
      abc += set[j][0].toABC(set[j][1]);
    }
  }

  return abc;
};

Score.parseABC = function(abc) {
  return new Score().parseABC(abc);
};

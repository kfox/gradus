#!/usr/bin/env node
Gradus = {};

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
Score.StaffElement = function() {
};

Score.StaffElement.prototype.ticks = function(){ return 0 };

Score.StaffElement.prototype.tickOffset = function(ref) {
  var ticks = 0;
  var chord = [];
  for (var e = ref; e != this; e = e.next) {
    if (chord.indexOf(e) == -1)
      ticks += e.ticks();
    if (e.type == 'Chord')
      chord = e.notes;
  }
  return ticks;
};

Score.StaffElement.prototype.isA = function(type) {
  var types = (typeof type == 'string') ? [type] : type;
  return types.indexOf(this.type) != -1;
};

Score.StaffElement.prototype.isBar = function() {
  switch(this.type) {
  case 'Bar':
  case 'Break':
    return true;
  default:
    return false;
  }
};

Score.StaffElement.prototype.findNext = function(type, opts) {
  opts = opts || {};
  var next = opts.self ? this : this.next;
  while (next) {
    if (opts.neighbor && next.isBar())
      return null;
    if (next.isA(type))
      return next;
    next = next.next;
  }
  return null;
};

Score.StaffElement.prototype.findPrev = function(type, opts) {
  opts = opts || {};
  var prev = opts.self ? this : this.prev;
  while (prev) {
    if (opts.neighbor && prev.isBar())
      return null;
    if (prev.isA(type))
      return prev;
    prev = prev.prev;
  }
  return null;
};

Score.StaffElement.prototype.render = function(svg, x, y) {
  this.avatar = svg.group();
};

Score.StaffElement.prototype.toABC = function() {
  return '';
};

Score.StaffElement.prototype.bindListeners = function() {
  var self = this;
  this.avatar.mousedown(function(e) {
    self.trigger('mousedown', e);
  });
  this.avatar.mousemove(function(e) {
    self.trigger('mousemove', e);
  });
};

Score.StaffElement.prototype.trigger = function(id, event) {
  var score = this.score;
  var scopedId = 'staff_element.'+id;
  event.scoreTarget = event.scoreTarget || this;
  if (score.eventListeners[scopedId])
    score.eventListeners[scopedId].call(this, event);
  if (this.measure)
    this.measure.trigger(id, event);
};

Score.Tickable = function() {
};

Score.Tickable.prototype = new Score.StaffElement();

Score.Tickable.prototype.isTriplet = function() {
  var x = this.findPrev('TupletBegin', {neighbor: true});
  for (var i = 0; x && i < 3; ++i) {
    x = x.findNext(['Note', 'Rest'], {neighbor: true});
    if (x == this)
      return true;
  }
  return false;
};

Score.Tickable.prototype.ticks = function() {
  var opts = this.opts;
  var ticks = this.part.unitNoteValue();
  var prev = this.findPrev(['Note', 'Rest']);
  var dswing = prev && prev.opts.swing;
  var uswing = opts.swing;

  if (opts.value.indexOf('/') != -1) {
    var parts = (opts.value[0]=='/' ? ('1'+opts.value) : opts.value).split('/');
    ticks *= parseInt(parts[0]) / parseInt(parts[1]);
  } else {
    ticks *= parseInt(opts.value);
  }

  if (this.isTriplet()) {
    switch(ticks) {
    case Score.QUAVER:
      return Score.QUAVER_TRIPLET;
    case Score.SEMIQUAVER:
      return Score.SEMIQUAVER_TRIPLET;
    default:
      throw "Unkown triplet = "+this;
    }
  }

  if (dswing)
    ticks /= 2;
  else if (uswing)
    ticks *= 1.5;
  return ticks;
};


// For Rest and Note
Score.Tickable.prototype.toABC = function() {
  var abc = '';
  abc += this.opts.accidentals || '';
  abc += this.type == 'Rest' ? 'z' : this.opts.pitch;
  abc += (this.opts.value == '1' ? '' : this.opts.value);
  if (!this.opts.beam)
    abc += ' ';
  if (this.opts.tie)
    abc += '-';
  return abc;
};

Score.Tickable.prototype.addText = function(text) {
  if (!this.avatar)
    return;

  this.removeText();

  var y = -this.part.place(this) * Score.Staff.LINE_HEIGHT/2 - 20;
  this.avatar._text = this.avatar.plain(text);
  this.avatar._text.y(y);
};

Score.Tickable.prototype.removeText = function() {
  this.avatar._text && this.avatar._text.remove();
  this.avatar._text = undefined;
};

Score.Set = function() {
  this.elements = [];
};

Score.Set.prototype.push = function(e) {
  this.elements.push(e);
};

Score.Set.prototype.filter = function(type) {
  var set = new Score.Set();
  for (var i = 0; i < this.elements.length; ++i)
    if (this.elements[i].isA(type))
      set.push(this.elements[i]);
  return set;
};

Score.Set.prototype.elementAtOffset = function(tickOffset) {
  var first = this.elements[0];
  var tickables = this.filter(['Note', 'Rest']);
  for (var i=0; i < tickables.elements.length; ++i)
    if (tickables.elements[i].tickOffset(first) >= tickOffset)
      return tickables.elements[i];
  return null;
};
Glyph = {
  Note: {
    render: function(svg, type, opts) {
      var glyph = svg.group();
      var note = glyph.group();
      glyph.note = note;

      var intersect_p = function(a, b) {
        return (Math.abs(a.x - b.x) * 2 < (a.width + b.width)) &&
          (Math.abs(a.y - b.y) * 2 < (a.height + b.height));
      };

      var dx = 0;
      if (opts.sharp || opts.flat || opts.natural) {
        if (opts.sharp)
          glyph.accidental = glyph.path(Glyph.glyphs['accidentals.sharp'].d);
        else if (opts.flat)
          glyph.accidental = glyph.path(Glyph.glyphs['accidentals.flat'].d);
        else if (opts.natural)
          glyph.accidental = glyph.path(Glyph.glyphs['accidentals.natural'].d);

        var box = glyph.accidental.bbox();
        box = {x: -10, y: box.y, width: box.width, height: box.height};
        var accidentals = opts.accidentals || [];
        while (accidentals.some(function(abox) { return intersect_p(abox, box) }))
          box.x -= 10;
        accidentals.push(box);
        note.x(-box.x);
        dx = box.x;
      }

      var head, flags = null;
      switch(type) {
      case 'whole':
      case 'half':
      case 'quarter':
        head = Glyph.glyphs['noteheads.'+type];
        break;
      case 'eighth':
        flags = 'flags.u8th';
      case 'sixteenth':
        flags = flags || 'flags.u16th';
        head = Glyph.glyphs['noteheads.quarter'];
        break;
      }

      glyph.head = note.path(head.d);
      if (opts.right)
        glyph.head.dx(head.w);

      if (opts.ledger !== undefined) {
        glyph.ledger = note.group();
        if (opts.ledger == 0)
          glyph.ledger.line(-3, 0, head.w+3, 0).stroke('#000');
        else if (opts.ledger == -1)
          glyph.ledger.line(-3, head.h/2, head.w+3, head.h/2).stroke('#000');
        else if (opts.ledger == 1)
          glyph.ledger.line(-3, -head.h/2, head.w+3, -head.h/2).stroke('#000');
        if (opts.right)
          glyph.ledger.dx(head.w);
      }

      glyph.stem = note.path([
        ['M', head.w-0.5, -0.5],
        ['l', 0, -Score.Staff.LINE_HEIGHT * 3.5]
      ]).stroke('#000');

      if (type == 'whole')
        glyph.stem.opacity(0.0);

      if (flags && !opts.noflags) {
        note.path(Glyph.glyphs[flags].d).
          move(head.w-0.5, -3.5*Score.Staff.LINE_HEIGHT);
      }

      if (opts.dot) {
        note.circle(4).move(head.w+1.5, 0);
      }

      var sup = glyph.x;
      glyph.x = function(x) {
        if (arguments.length)
          return sup.call(this, x+dx);
        else
          return sup.call(this);
      };

      return glyph;
    },

    beam: function(svg, start, end) {
      var pstart = start.avatar.stem.rbox();
      var pend = end.avatar.stem.rbox();
      var slope = (pend.y - pstart.y) / (pend.x - pstart.x);
      svg.path([
        ['M', pstart.x, pstart.y],
        ['L', pend.x, pend.y],
        ['l', 0, 4],
        ['L', pstart.x, pstart.y+4]
      ]).fill('#000');

      var beam = function(element) {
        var prev = element.findPrev('Note', {neighbor: true});
        var next = element.findNext('Note', {neighbor: true});
        var pelement = element.avatar.stem.rbox();
        var x0 = (prev && prev.type == 'Note' && prev.opts.beam) ?
            (3*pelement.x + prev.avatar.stem.rbox().x)/4
            : pelement.x;
        var x1 = (next && next.type == 'Note' && element.opts.beam) ?
            (3*pelement.x + next.avatar.stem.rbox().x)/4
            : pelement.x;
        var flags = element.flags();

        var plocal = element.avatar.stem.bbox();
        var dy = pelement.y - plocal.y;
        element.avatar.stem.plot([
          ['M', plocal.x, pstart.y+slope*(pelement.x-pstart.x)-dy],
          ['L', plocal.x, plocal.y2]
        ]);
        for (var y, i=1; i < flags; ++i) {
          y = pstart.y + slope*(x0-pstart.x);
          svg.path([
            ['M', x0, y + i*7],
            ['L', x1, y + i*7 + slope*(x1-x0)],
            ['l', 0, 4],
            ['L', x0, y + i*7 + 4],
          ]).fill('#000');
        }
      };

      var curr = start;
      while (curr) {
        beam(curr);
        curr = curr.beamNext();
      }
    }
  },
  Rest: {
    render: function(svg, type, opts) {
      var rest = 'rests.'+type;
      switch(type) {
      case 'eighth':
        rest = 'rests.8th';
        break;
      case 'sixteenth:':
        rest = 'rests.16th';
        break;
      }
      return svg.path(Glyph.glyphs[rest].d);
    }
  }
};

Score.Break = function(){}
Score.Break.prototype = new Score.StaffElement();
Score.Break.prototype.type = 'Break';
// Bugs:
//   * breaks when last element on line is a bar

Score.Formatter = function(voices, totalWidth) {
  this.voices = voices;
  this.totalWidth = totalWidth;
};

Score.Formatter.prototype.getEvents = function() {
  var events = {};
  var maxTick = 0;
  this.voices.forEach(function(voice) {
    voice.forEach(function(element) {
      var tick = element.tickOffset(voice[0]);
      if (element.isBar())
        return;
      maxTick = Math.max(maxTick, tick+element.ticks());
      if (events[tick]) {
        events[tick].elements.push(element);
        events[tick].prestretch = Math.max(events[tick].prestretch,
                                           element.avatar.bbox().width+2);
      } else {
        events[tick] = {
          elements: [element],
          tick: tick,
          prestretch: element.avatar.bbox().width+2
        };
      }
    });
  });

  var eventList = $.map(events, function(x){ return x }).sort(function(x,y) {
    return x.tick - y.tick;
  });
  eventList.forEach(function(e, i) {
    e.next = eventList[i+1];
    e.prev = eventList[i-1];
  });

  var barEvents = {};
  this.voices.forEach(function(voice) {
    voice.forEach(function(element) {
      var tick = element.tickOffset(voice[0]);

      if (!element.isBar())
        return;

      if (barEvents[tick]) {
        barEvents[tick].elements.push(element);
      } else {
        barEvents[tick] = {elements: [element], tick: tick, bar: true};

        var prev = {
          tick: tick,
          bar: true,
          elements: []
        }
        barEvents[tick].prestretch = prev.prestretch = 15;

        var e = events[tick] || eventList[eventList.length-1];
        barEvents[tick].prev = prev;
        barEvents[tick].next = e;
        prev.prev = e.prev;
        prev.next = barEvents[tick];

        e.prev = barEvents[tick];
        if (prev.prev)
          prev.prev.next = prev;
      }
    });
  });

  var list = [];
  for (var e = barEvents[0] || events[0]; e; e = e.next) {
    list.push(e);
  }

  var finalEvent = { elements: [], tick: maxTick };
  finalEvent.prev = list[list.length-1];
  list[list.length-1].next = finalEvent;
  list.push(finalEvent);

  return list;
};

Score.Formatter.prototype.getRods = function(events) {
  var rods = [];
  this.voices.forEach(function(voice) {
    var ref = voice[0];
    voice.forEach(function(element, ielement) {
      if (element.isBar())
        return;

      var tick = element.tickOffset(ref);
      var event = events.filter(function(e) {
        return e.tick == tick && !e.bar;
      })[0];

      var next = voice.slice(ielement+1).filter(function(element2) {
        return element2.tickOffset(ref) >= tick;
      })[0];
      if (!next)
        return;

      var nextEvent = event.next;
      if (!nextEvent) {
        console.log('next element has no corresponding event');
        return;
      }

      glyph = next.avatar;
      if (!glyph)
        return;

      rods.push({
        p1: event,
        p2: nextEvent,
        width: glyph.rbox().width + 15
      });
    });
  });

  rods.push({
    p1: events[0],
    p2: events[events.length-1],
    width: this.totalWidth-50
  });

  /*
    events.forEach(function(event) {
    if (event.bar) {
    rods.push({ p1: event, p2: event.next, width: 10 });
    rods.forEach(function(rod) {
    if (rod.p2 == event)
    rod.width += 10;
    });
    }
    });
  */
  return rods;
};

Score.Formatter.prototype.computeSpringConstants = function(events) {
  events.forEach(function(event, ievent) {
    if (event.bar) {
      event.c = 5;
    } else {
      if (event.next)
        event.duration = event.next.tick - event.tick;
      else
        event.duration = Score.CROCHET;
      event.c = 1 / (1+0.4*Math.log(event.duration/Score.SEMIQUAVER_TRIPLET));
    }
  });
};

Score.Formatter.prototype.apply = function(events, rods, f) {
  var totalExtent = 0;
  for (var psf, i=0; i < events.length; ++i) {
    psf = events[i].prestretch ? (events[i].c*events[i].prestretch) : 0;
    events[i].extent = f > psf ? (f / events[i].c) : events[i].prestretch;
    totalExtent += events[i].extent;
  }

  var event = events[0];
  while (event.next) {
    event.next.extent += event.extent;
    event = event.next;
  }
  for (var x, i=0; i < events.length; ++i) {
    x = (i == 0) ? 0 : events[i-1].extent;
    events[i].offset = x;
  }
  var satisfied = true;
  for (var i=0; i < rods.length; ++i) {
    if (rods[i].p2.offset-rods[i].p1.offset < rods[i].width) {
      satisfied = rods.satisfied = false;
    } else {
      rods[i].satisfied = true;
    }
  }
  return satisfied;
};

Score.Formatter.prototype.solveForceFunction = function(events, rods) {
  var maxTries = 30;
  for (var f = 1; f < maxTries; ++f)
    if (this.apply(events, rods, f))
      break;
  if (f == maxTries)
    throw "Couldn't satisfy string problem";
};

Score.Formatter.prototype.debug = function(events, rods, x) {
  return;
  var y = null;
  this.voices.forEach(function(voice) {
    voice.forEach(function(element) {
      if (element.avatar)
        y = y || element.avatar.rbox().y;
    });
  });

  for (var color, rod, i=0; i < rods.length; ++i) {
    rod = rods[i];
    color = rod.color || (rod.satisfied ? ['#00f', '#0f0'][i%2] : '#f00');
    if (!rod.satisfied)
      console.log(rod);
    svg0.rect(rod.width, 5).
      move(x+rod.p1.offset, y + 40 + 5 * (i % 5)).
      fill(color);
  }

  for (var i=0; i < events.length; ++i) {
    var color = '#999';
    if (events[i].bar)
      color = '#f00';
    svg0.line(x+events[i].offset, y,
              x+events[i].offset, y+100).
      stroke(color);
    if (events[i].prestretch){
      svg0.rect(events[i].prestretch, 5).
        move(x+events[i].offset, y).
        fill('#f0f');
    }
  }
};

Score.Formatter.prototype.format = function(offset) {
  var events = this.getEvents();
  var rods = this.getRods(events);

  this.computeSpringConstants(events);
  this.solveForceFunction(events, rods);

  this.debug(events, rods, offset);

  events.forEach(function(event, ievent) {
    var x = (ievent == 0) ? offset : offset + events[ievent-1].extent;
    event.elements.forEach(function(element) {
      element.avatar && element.avatar.x(x);
    });
  });

  return offset + events[events.length-1].extent;
};
Glyph.glyphs = {"rests.whole":{"d":[["M", 0.06, 0.03], ["l", 0.09, -0.06], ["l", 5.46, 0], ["l", 5.49, 0], ["l", 0.09, 0.06], ["l", 0.06, 0.09], ["l", 0, 2.19], ["l", 0, 2.19], ["l", -0.06, 0.09], ["l", -0.09, 0.06], ["l", -5.49, 0], ["l", -5.46, 0], ["l", -0.09, -0.06], ["l", -0.06, -0.09], ["l", 0, -2.19], ["l", 0, -2.19], ["z"]],"w":11.25,"h":4.68},"rests.half":{"d":[["M", 0.06, -4.62], ["l", 0.09, -0.06], ["l", 5.46, 0], ["l", 5.49, 0], ["l", 0.09, 0.06], ["l", 0.06, 0.09], ["l", 0, 2.19], ["l", 0, 2.19], ["l", -0.06, 0.09], ["l", -0.09, 0.06], ["l", -5.49, 0], ["l", -5.46, 0], ["l", -0.09, -0.06], ["l", -0.06, -0.09], ["l", 0, -2.19], ["l", 0, -2.19], ["z"]],"w":11.25,"h":4.68},"rests.quarter":{"d":[["M", 1.89, -11.82], ["c", 0.12, -0.06, 0.24, -0.06, 0.36, -0.03], ["c", 0.09, 0.06, 4.74, 5.58, 4.86, 5.82], ["c", 0.21, 0.39, 0.15, 0.78, -0.15, 1.26], ["c", -0.24, 0.33, -0.72, 0.81, -1.62, 1.56], ["c", -0.45, 0.36, -0.87, 0.75, -0.96, 0.84], ["c", -0.93, 0.99, -1.14, 2.49, -0.6, 3.63], ["c", 0.18, 0.39, 0.27, 0.48, 1.32, 1.68], ["c", 1.92, 2.25, 1.83, 2.16, 1.83, 2.34], ["c", -0, 0.18, -0.18, 0.36, -0.36, 0.39], ["c", -0.15, -0, -0.27, -0.06, -0.48, -0.27], ["c", -0.75, -0.75, -2.46, -1.29, -3.39, -1.08], ["c", -0.45, 0.09, -0.69, 0.27, -0.9, 0.69], ["c", -0.12, 0.3, -0.21, 0.66, -0.24, 1.14], ["c", -0.03, 0.66, 0.09, 1.35, 0.3, 2.01], ["c", 0.15, 0.42, 0.24, 0.66, 0.45, 0.96], ["c", 0.18, 0.24, 0.18, 0.33, 0.03, 0.42], ["c", -0.12, 0.06, -0.18, 0.03, -0.45, -0.3], ["c", -1.08, -1.38, -2.07, -3.36, -2.4, -4.83], ["c", -0.27, -1.05, -0.15, -1.77, 0.27, -2.07], ["c", 0.21, -0.12, 0.42, -0.15, 0.87, -0.15], ["c", 0.87, 0.06, 2.1, 0.39, 3.3, 0.9], ["l", 0.39, 0.18], ["l", -1.65, -1.95], ["c", -2.52, -2.97, -2.61, -3.09, -2.7, -3.27], ["c", -0.09, -0.24, -0.12, -0.48, -0.03, -0.75], ["c", 0.15, -0.48, 0.57, -0.96, 1.83, -2.01], ["c", 0.45, -0.36, 0.84, -0.72, 0.93, -0.78], ["c", 0.69, -0.75, 1.02, -1.8, 0.9, -2.79], ["c", -0.06, -0.33, -0.21, -0.84, -0.39, -1.11], ["c", -0.09, -0.15, -0.45, -0.6, -0.81, -1.05], ["c", -0.36, -0.42, -0.69, -0.81, -0.72, -0.87], ["c", -0.09, -0.18, -0, -0.42, 0.21, -0.51], ["z"]],"w":7.888,"h":21.435},"rests.8th":{"d":[["M", 1.68, -6.12], ["c", 0.66, -0.09, 1.23, 0.09, 1.68, 0.51], ["c", 0.27, 0.3, 0.39, 0.54, 0.57, 1.26], ["c", 0.09, 0.33, 0.18, 0.66, 0.21, 0.72], ["c", 0.12, 0.27, 0.33, 0.45, 0.6, 0.48], ["c", 0.12, 0, 0.18, 0, 0.33, -0.09], ["c", 0.39, -0.18, 1.32, -1.29, 1.68, -1.98], ["c", 0.09, -0.21, 0.24, -0.3, 0.39, -0.3], ["c", 0.12, 0, 0.27, 0.09, 0.33, 0.18], ["c", 0.03, 0.06, -0.27, 1.11, -1.86, 6.42], ["c", -1.02, 3.48, -1.89, 6.39, -1.92, 6.42], ["c", 0, 0.03, -0.12, 0.12, -0.24, 0.15], ["c", -0.18, 0.09, -0.21, 0.09, -0.45, 0.09], ["c", -0.24, 0, -0.3, 0, -0.48, -0.06], ["c", -0.09, -0.06, -0.21, -0.12, -0.21, -0.15], ["c", -0.06, -0.03, 0.15, -0.57, 1.68, -4.92], ["c", 0.96, -2.67, 1.74, -4.89, 1.71, -4.89], ["l", -0.51, 0.15], ["c", -1.08, 0.36, -1.74, 0.48, -2.55, 0.48], ["c", -0.66, 0, -0.84, -0.03, -1.32, -0.27], ["c", -1.32, -0.63, -1.77, -2.16, -1.02, -3.3], ["c", 0.33, -0.45, 0.84, -0.81, 1.38, -0.9], ["z"]],"w":7.534,"h":13.883},"rests.16th":{"d":[["M", 3.33, -6.12], ["c", 0.66, -0.09, 1.23, 0.09, 1.68, 0.51], ["c", 0.27, 0.3, 0.39, 0.54, 0.57, 1.26], ["c", 0.09, 0.33, 0.18, 0.66, 0.21, 0.72], ["c", 0.15, 0.39, 0.57, 0.57, 0.87, 0.42], ["c", 0.39, -0.18, 1.2, -1.23, 1.62, -2.07], ["c", 0.06, -0.15, 0.24, -0.24, 0.36, -0.24], ["c", 0.12, 0, 0.27, 0.09, 0.33, 0.18], ["c", 0.03, 0.06, -0.45, 1.86, -2.67, 10.17], ["c", -1.5, 5.55, -2.73, 10.14, -2.76, 10.17], ["c", -0.03, 0.03, -0.12, 0.12, -0.24, 0.15], ["c", -0.18, 0.09, -0.21, 0.09, -0.45, 0.09], ["c", -0.24, 0, -0.3, 0, -0.48, -0.06], ["c", -0.09, -0.06, -0.21, -0.12, -0.21, -0.15], ["c", -0.06, -0.03, 0.12, -0.57, 1.44, -4.92], ["c", 0.81, -2.67, 1.47, -4.86, 1.47, -4.89], ["c", -0.03, 0, -0.27, 0.06, -0.54, 0.15], ["c", -1.08, 0.36, -1.77, 0.48, -2.58, 0.48], ["c", -0.66, 0, -0.84, -0.03, -1.32, -0.27], ["c", -1.32, -0.63, -1.77, -2.16, -1.02, -3.3], ["c", 0.72, -1.05, 2.22, -1.23, 3.06, -0.42], ["c", 0.3, 0.33, 0.42, 0.6, 0.6, 1.38], ["c", 0.09, 0.45, 0.21, 0.78, 0.33, 0.9], ["c", 0.09, 0.09, 0.27, 0.18, 0.45, 0.21], ["c", 0.12, 0, 0.18, 0, 0.33, -0.09], ["c", 0.33, -0.15, 1.02, -0.93, 1.41, -1.59], ["c", 0.12, -0.21, 0.18, -0.39, 0.39, -1.08], ["c", 0.66, -2.1, 1.17, -3.84, 1.17, -3.87], ["c", 0, 0, -0.21, 0.06, -0.42, 0.15], ["c", -0.51, 0.15, -1.2, 0.33, -1.68, 0.42], ["c", -0.33, 0.06, -0.51, 0.06, -0.96, 0.06], ["c", -0.66, 0, -0.84, -0.03, -1.32, -0.27], ["c", -1.32, -0.63, -1.77, -2.16, -1.02, -3.3], ["c", 0.33, -0.45, 0.84, -0.81, 1.38, -0.9], ["z"]],"w":9.724,"h":21.383},"rests.32nd":{"d":[["M", 4.23, -13.62], ["c", 0.66, -0.09, 1.23, 0.09, 1.68, 0.51], ["c", 0.27, 0.3, 0.39, 0.54, 0.57, 1.26], ["c", 0.09, 0.33, 0.18, 0.66, 0.21, 0.72], ["c", 0.12, 0.27, 0.33, 0.45, 0.6, 0.48], ["c", 0.12, 0, 0.18, 0, 0.27, -0.06], ["c", 0.33, -0.21, 0.99, -1.11, 1.44, -1.98], ["c", 0.09, -0.24, 0.21, -0.33, 0.39, -0.33], ["c", 0.12, 0, 0.27, 0.09, 0.33, 0.18], ["c", 0.03, 0.06, -0.57, 2.67, -3.21, 13.89], ["c", -1.8, 7.62, -3.3, 13.89, -3.3, 13.92], ["c", -0.03, 0.06, -0.12, 0.12, -0.24, 0.18], ["c", -0.21, 0.09, -0.24, 0.09, -0.48, 0.09], ["c", -0.24, -0, -0.3, -0, -0.48, -0.06], ["c", -0.09, -0.06, -0.21, -0.12, -0.21, -0.15], ["c", -0.06, -0.03, 0.09, -0.57, 1.23, -4.92], ["c", 0.69, -2.67, 1.26, -4.86, 1.29, -4.89], ["c", 0, -0.03, -0.12, -0.03, -0.48, 0.12], ["c", -1.17, 0.39, -2.22, 0.57, -3, 0.54], ["c", -0.42, -0.03, -0.75, -0.12, -1.11, -0.3], ["c", -1.32, -0.63, -1.77, -2.16, -1.02, -3.3], ["c", 0.72, -1.05, 2.22, -1.23, 3.06, -0.42], ["c", 0.3, 0.33, 0.42, 0.6, 0.6, 1.38], ["c", 0.09, 0.45, 0.21, 0.78, 0.33, 0.9], ["c", 0.12, 0.09, 0.3, 0.18, 0.48, 0.21], ["c", 0.12, -0, 0.18, -0, 0.3, -0.09], ["c", 0.42, -0.21, 1.29, -1.29, 1.56, -1.89], ["c", 0.03, -0.12, 1.23, -4.59, 1.23, -4.65], ["c", 0, -0.03, -0.18, 0.03, -0.39, 0.12], ["c", -0.63, 0.18, -1.2, 0.36, -1.74, 0.45], ["c", -0.39, 0.06, -0.54, 0.06, -1.02, 0.06], ["c", -0.66, -0, -0.84, -0.03, -1.32, -0.27], ["c", -1.32, -0.63, -1.77, -2.16, -1.02, -3.3], ["c", 0.72, -1.05, 2.22, -1.23, 3.06, -0.42], ["c", 0.3, 0.33, 0.42, 0.6, 0.6, 1.38], ["c", 0.09, 0.45, 0.21, 0.78, 0.33, 0.9], ["c", 0.18, 0.18, 0.51, 0.27, 0.72, 0.15], ["c", 0.3, -0.12, 0.69, -0.57, 1.08, -1.17], ["c", 0.42, -0.6, 0.39, -0.51, 1.05, -3.03], ["c", 0.33, -1.26, 0.6, -2.31, 0.6, -2.34], ["c", 0, -0, -0.21, 0.03, -0.45, 0.12], ["c", -0.57, 0.18, -1.14, 0.33, -1.62, 0.42], ["c", -0.33, 0.06, -0.51, 0.06, -0.96, 0.06], ["c", -0.66, -0, -0.84, -0.03, -1.32, -0.27], ["c", -1.32, -0.63, -1.77, -2.16, -1.02, -3.3], ["c", 0.33, -0.45, 0.84, -0.81, 1.38, -0.9], ["z"]],"w":11.373,"h":28.883},"rests.64th":{"d":[["M", 5.13, -13.62], ["c", 0.66, -0.09, 1.23, 0.09, 1.68, 0.51], ["c", 0.27, 0.3, 0.39, 0.54, 0.57, 1.26], ["c", 0.15, 0.63, 0.21, 0.81, 0.33, 0.96], ["c", 0.18, 0.21, 0.54, 0.3, 0.75, 0.18], ["c", 0.24, -0.12, 0.63, -0.66, 1.08, -1.56], ["c", 0.33, -0.66, 0.39, -0.72, 0.6, -0.72], ["c", 0.12, 0, 0.27, 0.09, 0.33, 0.18], ["c", 0.03, 0.06, -0.69, 3.66, -3.54, 17.64], ["c", -1.95, 9.66, -3.57, 17.61, -3.57, 17.64], ["c", -0.03, 0.06, -0.12, 0.12, -0.24, 0.18], ["c", -0.21, 0.09, -0.24, 0.09, -0.48, 0.09], ["c", -0.24, 0, -0.3, 0, -0.48, -0.06], ["c", -0.09, -0.06, -0.21, -0.12, -0.21, -0.15], ["c", -0.06, -0.03, 0.06, -0.57, 1.05, -4.95], ["c", 0.6, -2.7, 1.08, -4.89, 1.08, -4.92], ["c", 0, 0, -0.24, 0.06, -0.51, 0.15], ["c", -0.66, 0.24, -1.2, 0.36, -1.77, 0.48], ["c", -0.42, 0.06, -0.57, 0.06, -1.05, 0.06], ["c", -0.69, 0, -0.87, -0.03, -1.35, -0.27], ["c", -1.32, -0.63, -1.77, -2.16, -1.02, -3.3], ["c", 0.72, -1.05, 2.22, -1.23, 3.06, -0.42], ["c", 0.3, 0.33, 0.42, 0.6, 0.6, 1.38], ["c", 0.09, 0.45, 0.21, 0.78, 0.33, 0.9], ["c", 0.09, 0.09, 0.27, 0.18, 0.45, 0.21], ["c", 0.21, 0.03, 0.39, -0.09, 0.72, -0.42], ["c", 0.45, -0.45, 1.02, -1.26, 1.17, -1.65], ["c", 0.03, -0.09, 0.27, -1.14, 0.54, -2.34], ["c", 0.27, -1.2, 0.48, -2.19, 0.51, -2.22], ["c", 0, -0.03, -0.09, -0.03, -0.48, 0.12], ["c", -1.17, 0.39, -2.22, 0.57, -3, 0.54], ["c", -0.42, -0.03, -0.75, -0.12, -1.11, -0.3], ["c", -1.32, -0.63, -1.77, -2.16, -1.02, -3.3], ["c", 0.36, -0.54, 0.96, -0.87, 1.65, -0.93], ["c", 0.54, -0.03, 1.02, 0.15, 1.41, 0.54], ["c", 0.27, 0.3, 0.39, 0.54, 0.57, 1.26], ["c", 0.09, 0.33, 0.18, 0.66, 0.21, 0.72], ["c", 0.15, 0.39, 0.57, 0.57, 0.9, 0.42], ["c", 0.36, -0.18, 1.2, -1.26, 1.47, -1.89], ["c", 0.03, -0.09, 0.3, -1.2, 0.57, -2.43], ["l", 0.51, -2.28], ["l", -0.54, 0.18], ["c", -1.11, 0.36, -1.8, 0.48, -2.61, 0.48], ["c", -0.66, 0, -0.84, -0.03, -1.32, -0.27], ["c", -1.32, -0.63, -1.77, -2.16, -1.02, -3.3], ["c", 0.36, -0.54, 0.96, -0.87, 1.65, -0.93], ["c", 0.54, -0.03, 1.02, 0.15, 1.41, 0.54], ["c", 0.27, 0.3, 0.39, 0.54, 0.57, 1.26], ["c", 0.15, 0.63, 0.21, 0.81, 0.33, 0.96], ["c", 0.21, 0.21, 0.54, 0.3, 0.75, 0.18], ["c", 0.36, -0.18, 0.93, -0.93, 1.29, -1.68], ["c", 0.12, -0.24, 0.18, -0.48, 0.63, -2.55], ["l", 0.51, -2.31], ["c", 0, -0.03, -0.18, 0.03, -0.39, 0.12], ["c", -1.14, 0.36, -2.1, 0.54, -2.82, 0.51], ["c", -0.42, -0.03, -0.75, -0.12, -1.11, -0.3], ["c", -1.32, -0.63, -1.77, -2.16, -1.02, -3.3], ["c", 0.33, -0.45, 0.84, -0.81, 1.38, -0.9], ["z"]],"w":12.453,"h":36.383},"rests.128th":{"d":[["M", 6.03, -21.12], ["c", 0.66, -0.09, 1.23, 0.09, 1.68, 0.51], ["c", 0.27, 0.3, 0.39, 0.54, 0.57, 1.26], ["c", 0.09, 0.33, 0.18, 0.66, 0.21, 0.72], ["c", 0.12, 0.27, 0.33, 0.45, 0.6, 0.48], ["c", 0.21, 0, 0.33, -0.06, 0.54, -0.36], ["c", 0.15, -0.21, 0.54, -0.93, 0.78, -1.47], ["c", 0.15, -0.33, 0.18, -0.39, 0.3, -0.48], ["c", 0.18, -0.09, 0.45, 0, 0.51, 0.15], ["c", 0.03, 0.09, -7.11, 42.75, -7.17, 42.84], ["c", -0.03, 0.03, -0.15, 0.09, -0.24, 0.15], ["c", -0.18, 0.06, -0.24, 0.06, -0.45, 0.06], ["c", -0.24, -0, -0.3, -0, -0.48, -0.06], ["c", -0.09, -0.06, -0.21, -0.12, -0.21, -0.15], ["c", -0.06, -0.03, 0.03, -0.57, 0.84, -4.98], ["c", 0.51, -2.7, 0.93, -4.92, 0.9, -4.92], ["c", 0, -0, -0.15, 0.06, -0.36, 0.12], ["c", -0.78, 0.27, -1.62, 0.48, -2.31, 0.57], ["c", -0.15, 0.03, -0.54, 0.03, -0.81, 0.03], ["c", -0.66, -0, -0.84, -0.03, -1.32, -0.27], ["c", -1.32, -0.63, -1.77, -2.16, -1.02, -3.3], ["c", 0.36, -0.54, 0.96, -0.87, 1.65, -0.93], ["c", 0.54, -0.03, 1.02, 0.15, 1.41, 0.54], ["c", 0.27, 0.3, 0.39, 0.54, 0.57, 1.26], ["c", 0.09, 0.33, 0.18, 0.66, 0.21, 0.72], ["c", 0.12, 0.27, 0.33, 0.45, 0.63, 0.48], ["c", 0.12, -0, 0.18, -0, 0.3, -0.09], ["c", 0.42, -0.21, 1.14, -1.11, 1.5, -1.83], ["c", 0.12, -0.27, 0.12, -0.27, 0.54, -2.52], ["c", 0.24, -1.23, 0.42, -2.25, 0.39, -2.25], ["c", 0, -0, -0.24, 0.06, -0.51, 0.18], ["c", -1.26, 0.39, -2.25, 0.57, -3.06, 0.54], ["c", -0.42, -0.03, -0.75, -0.12, -1.11, -0.3], ["c", -1.32, -0.63, -1.77, -2.16, -1.02, -3.3], ["c", 0.36, -0.54, 0.96, -0.87, 1.65, -0.93], ["c", 0.54, -0.03, 1.02, 0.15, 1.41, 0.54], ["c", 0.27, 0.3, 0.39, 0.54, 0.57, 1.26], ["c", 0.15, 0.63, 0.21, 0.81, 0.33, 0.96], ["c", 0.18, 0.21, 0.51, 0.3, 0.75, 0.18], ["c", 0.36, -0.15, 1.05, -0.99, 1.41, -1.77], ["l", 0.15, -0.3], ["l", 0.42, -2.25], ["c", 0.21, -1.26, 0.42, -2.28, 0.39, -2.28], ["l", -0.51, 0.15], ["c", -1.11, 0.39, -1.89, 0.51, -2.7, 0.51], ["c", -0.66, -0, -0.84, -0.03, -1.32, -0.27], ["c", -1.32, -0.63, -1.77, -2.16, -1.02, -3.3], ["c", 0.36, -0.54, 0.96, -0.87, 1.65, -0.93], ["c", 0.54, -0.03, 1.02, 0.15, 1.41, 0.54], ["c", 0.27, 0.3, 0.39, 0.54, 0.57, 1.26], ["c", 0.15, 0.63, 0.21, 0.81, 0.33, 0.96], ["c", 0.18, 0.18, 0.48, 0.27, 0.72, 0.21], ["c", 0.33, -0.12, 1.14, -1.26, 1.41, -1.95], ["c", 0, -0.09, 0.21, -1.11, 0.45, -2.34], ["c", 0.21, -1.2, 0.39, -2.22, 0.39, -2.28], ["c", 0.03, -0.03, 0, -0.03, -0.45, 0.12], ["c", -0.57, 0.18, -1.2, 0.33, -1.71, 0.42], ["c", -0.3, 0.06, -0.51, 0.06, -0.93, 0.06], ["c", -0.66, -0, -0.84, -0.03, -1.32, -0.27], ["c", -1.32, -0.63, -1.77, -2.16, -1.02, -3.3], ["c", 0.36, -0.54, 0.96, -0.87, 1.65, -0.93], ["c", 0.54, -0.03, 1.02, 0.15, 1.41, 0.54], ["c", 0.27, 0.3, 0.39, 0.54, 0.57, 1.26], ["c", 0.09, 0.33, 0.18, 0.66, 0.21, 0.72], ["c", 0.12, 0.27, 0.33, 0.45, 0.6, 0.48], ["c", 0.18, -0, 0.36, -0.09, 0.57, -0.33], ["c", 0.33, -0.36, 0.78, -1.14, 0.93, -1.56], ["c", 0.03, -0.12, 0.24, -1.2, 0.45, -2.4], ["c", 0.24, -1.2, 0.42, -2.22, 0.42, -2.28], ["c", 0.03, -0.03, 0, -0.03, -0.39, 0.09], ["c", -1.05, 0.36, -1.8, 0.48, -2.58, 0.48], ["c", -0.63, -0, -0.84, -0.03, -1.29, -0.27], ["c", -1.32, -0.63, -1.77, -2.16, -1.02, -3.3], ["c", 0.33, -0.45, 0.84, -0.81, 1.38, -0.9], ["z"]],"w":12.992,"h":43.883},"accidentals.sharp":{"d":[["M", 5.73, -11.19], ["c", 0.21, -0.12, 0.54, -0.03, 0.66, 0.24], ["c", 0.06, 0.12, 0.06, 0.21, 0.06, 2.31], ["c", 0, 1.23, 0, 2.22, 0.03, 2.22], ["c", 0, -0, 0.27, -0.12, 0.6, -0.24], ["c", 0.69, -0.27, 0.78, -0.3, 0.96, -0.15], ["c", 0.21, 0.15, 0.21, 0.18, 0.21, 1.38], ["c", 0, 1.02, 0, 1.11, -0.06, 1.2], ["c", -0.03, 0.06, -0.09, 0.12, -0.12, 0.15], ["c", -0.06, 0.03, -0.42, 0.21, -0.84, 0.36], ["l", -0.75, 0.33], ["l", -0.03, 2.43], ["c", 0, 1.32, 0, 2.43, 0.03, 2.43], ["c", 0, -0, 0.27, -0.12, 0.6, -0.24], ["c", 0.69, -0.27, 0.78, -0.3, 0.96, -0.15], ["c", 0.21, 0.15, 0.21, 0.18, 0.21, 1.38], ["c", 0, 1.02, 0, 1.11, -0.06, 1.2], ["c", -0.03, 0.06, -0.09, 0.12, -0.12, 0.15], ["c", -0.06, 0.03, -0.42, 0.21, -0.84, 0.36], ["l", -0.75, 0.33], ["l", -0.03, 2.52], ["c", 0, 2.28, -0.03, 2.55, -0.06, 2.64], ["c", -0.21, 0.36, -0.72, 0.36, -0.93, -0], ["c", -0.03, -0.09, -0.06, -0.33, -0.06, -2.43], ["l", 0, -2.31], ["l", -1.29, 0.51], ["l", -1.26, 0.51], ["l", 0, 2.43], ["c", 0, 2.58, 0, 2.52, -0.15, 2.67], ["c", -0.06, 0.09, -0.27, 0.18, -0.36, 0.18], ["c", -0.12, -0, -0.33, -0.09, -0.39, -0.18], ["c", -0.15, -0.15, -0.15, -0.09, -0.15, -2.43], ["c", 0, -1.23, 0, -2.22, -0.03, -2.22], ["c", 0, -0, -0.27, 0.12, -0.6, 0.24], ["c", -0.69, 0.27, -0.78, 0.3, -0.96, 0.15], ["c", -0.21, -0.15, -0.21, -0.18, -0.21, -1.38], ["c", 0, -1.02, 0, -1.11, 0.06, -1.2], ["c", 0.03, -0.06, 0.09, -0.12, 0.12, -0.15], ["c", 0.06, -0.03, 0.42, -0.21, 0.84, -0.36], ["l", 0.78, -0.33], ["l", 0, -2.43], ["c", 0, -1.32, 0, -2.43, -0.03, -2.43], ["c", 0, -0, -0.27, 0.12, -0.6, 0.24], ["c", -0.69, 0.27, -0.78, 0.3, -0.96, 0.15], ["c", -0.21, -0.15, -0.21, -0.18, -0.21, -1.38], ["c", 0, -1.02, 0, -1.11, 0.06, -1.2], ["c", 0.03, -0.06, 0.09, -0.12, 0.12, -0.15], ["c", 0.06, -0.03, 0.42, -0.21, 0.84, -0.36], ["l", 0.78, -0.33], ["l", 0, -2.52], ["c", 0, -2.28, 0.03, -2.55, 0.06, -2.64], ["c", 0.21, -0.36, 0.72, -0.36, 0.93, 0], ["c", 0.03, 0.09, 0.06, 0.33, 0.06, 2.43], ["l", 0.03, 2.31], ["l", 1.26, -0.51], ["l", 1.26, -0.51], ["l", 0, -2.43], ["c", 0, -2.28, 0, -2.43, 0.06, -2.55], ["c", 0.06, -0.12, 0.12, -0.18, 0.27, -0.24], ["z"], ["m", -0.33, 10.65], ["l", 0, -2.43], ["l", -1.29, 0.51], ["l", -1.26, 0.51], ["l", 0, 2.46], ["l", 0, 2.43], ["l", 0.09, -0.03], ["c", 0.06, -0.03, 0.63, -0.27, 1.29, -0.51], ["l", 1.17, -0.48], ["l", 0, -2.46], ["z"]],"w":8.25,"h":22.462},"accidentals.halfsharp":{"d":[["M", 2.43, -10.05], ["c", 0.21, -0.12, 0.54, -0.03, 0.66, 0.24], ["c", 0.06, 0.12, 0.06, 0.21, 0.06, 2.01], ["c", 0, 1.05, 0, 1.89, 0.03, 1.89], ["l", 0.72, -0.48], ["c", 0.69, -0.48, 0.69, -0.51, 0.87, -0.51], ["c", 0.15, 0, 0.18, 0.03, 0.27, 0.09], ["c", 0.21, 0.15, 0.21, 0.18, 0.21, 1.41], ["c", 0, 1.11, -0.03, 1.14, -0.09, 1.23], ["c", -0.03, 0.03, -0.48, 0.39, -1.02, 0.75], ["l", -0.99, 0.66], ["l", 0, 2.37], ["c", 0, 1.32, 0, 2.37, 0.03, 2.37], ["l", 0.72, -0.48], ["c", 0.69, -0.48, 0.69, -0.51, 0.87, -0.51], ["c", 0.15, 0, 0.18, 0.03, 0.27, 0.09], ["c", 0.21, 0.15, 0.21, 0.18, 0.21, 1.41], ["c", 0, 1.11, -0.03, 1.14, -0.09, 1.23], ["c", -0.03, 0.03, -0.48, 0.39, -1.02, 0.75], ["l", -0.99, 0.66], ["l", 0, 2.25], ["c", 0, 1.95, 0, 2.28, -0.06, 2.37], ["c", -0.06, 0.12, -0.12, 0.21, -0.24, 0.27], ["c", -0.27, 0.12, -0.54, 0.03, -0.69, -0.24], ["c", -0.06, -0.12, -0.06, -0.21, -0.06, -2.01], ["c", 0, -1.05, 0, -1.89, -0.03, -1.89], ["l", -0.72, 0.48], ["c", -0.69, 0.48, -0.69, 0.48, -0.87, 0.48], ["c", -0.15, 0, -0.18, 0, -0.27, -0.06], ["c", -0.21, -0.15, -0.21, -0.18, -0.21, -1.41], ["c", 0, -1.11, 0.03, -1.14, 0.09, -1.23], ["c", 0.03, -0.03, 0.48, -0.39, 1.02, -0.75], ["l", 0.99, -0.66], ["l", 0, -2.37], ["c", 0, -1.32, 0, -2.37, -0.03, -2.37], ["l", -0.72, 0.48], ["c", -0.69, 0.48, -0.69, 0.48, -0.87, 0.48], ["c", -0.15, 0, -0.18, 0, -0.27, -0.06], ["c", -0.21, -0.15, -0.21, -0.18, -0.21, -1.41], ["c", 0, -1.11, 0.03, -1.14, 0.09, -1.23], ["c", 0.03, -0.03, 0.48, -0.39, 1.02, -0.75], ["l", 0.99, -0.66], ["l", 0, -2.25], ["c", 0, -2.13, 0, -2.28, 0.06, -2.4], ["c", 0.06, -0.12, 0.12, -0.18, 0.27, -0.24], ["z"]],"w":5.25,"h":20.174},"accidentals.nat":{"d":[["M", 0.204, -11.4], ["c", 0.24, -0.06, 0.78, 0, 0.99, 0.15], ["c", 0.03, 0.03, 0.03, 0.48, 0, 2.61], ["c", -0.03, 1.44, -0.03, 2.61, -0.03, 2.61], ["c", 0, 0.03, 0.75, -0.09, 1.68, -0.24], ["c", 0.96, -0.18, 1.71, -0.27, 1.74, -0.27], ["c", 0.15, 0.03, 0.27, 0.15, 0.36, 0.3], ["l", 0.06, 0.12], ["l", 0.09, 8.67], ["c", 0.09, 6.96, 0.12, 8.67, 0.09, 8.67], ["c", -0.03, 0.03, -0.12, 0.06, -0.21, 0.09], ["c", -0.24, 0.09, -0.72, 0.09, -0.96, 0], ["c", -0.09, -0.03, -0.18, -0.06, -0.21, -0.09], ["c", -0.03, -0.03, -0.03, -0.48, 0, -2.61], ["c", 0.03, -1.44, 0.03, -2.61, 0.03, -2.61], ["c", 0, -0.03, -0.75, 0.09, -1.68, 0.24], ["c", -0.96, 0.18, -1.71, 0.27, -1.74, 0.27], ["c", -0.15, -0.03, -0.27, -0.15, -0.36, -0.3], ["l", -0.06, -0.15], ["l", -0.09, -7.53], ["c", -0.06, -4.14, -0.09, -8.04, -0.12, -8.67], ["l", 0, -1.11], ["l", 0.15, -0.06], ["c", 0.09, -0.03, 0.21, -0.06, 0.27, -0.09], ["z"], ["m", 3.75, 8.4], ["c", 0, -0.33, 0, -0.42, -0.03, -0.42], ["c", -0.12, 0, -2.79, 0.45, -2.79, 0.48], ["c", -0.03, 0, -0.09, 6.3, -0.09, 6.33], ["c", 0.03, 0, 2.79, -0.45, 2.82, -0.48], ["c", 0, 0, 0.09, -4.53, 0.09, -5.91], ["z"]],"w":5.411,"h":22.8},"accidentals.flat":{"d":[["M", -0.36, -14.07], ["c", 0.33, -0.06, 0.87, 0, 1.08, 0.15], ["c", 0.06, 0.03, 0.06, 0.36, -0.03, 5.25], ["c", -0.06, 2.85, -0.09, 5.19, -0.09, 5.19], ["c", 0, 0.03, 0.12, -0.03, 0.24, -0.12], ["c", 0.63, -0.42, 1.41, -0.66, 2.19, -0.72], ["c", 0.81, -0.03, 1.47, 0.21, 2.04, 0.78], ["c", 0.57, 0.54, 0.87, 1.26, 0.93, 2.04], ["c", 0.03, 0.57, -0.09, 1.08, -0.36, 1.62], ["c", -0.42, 0.81, -1.02, 1.38, -2.82, 2.61], ["c", -1.14, 0.78, -1.44, 1.02, -1.8, 1.44], ["c", -0.18, 0.18, -0.39, 0.39, -0.45, 0.42], ["c", -0.27, 0.18, -0.57, 0.15, -0.81, -0.06], ["c", -0.06, -0.09, -0.12, -0.18, -0.15, -0.27], ["c", -0.03, -0.06, -0.09, -3.27, -0.18, -8.34], ["c", -0.09, -4.53, -0.15, -8.58, -0.18, -9.03], ["l", 0, -0.78], ["l", 0.12, -0.06], ["c", 0.06, -0.03, 0.18, -0.09, 0.27, -0.12], ["z"], ["m", 3.18, 11.01], ["c", -0.21, -0.12, -0.54, -0.15, -0.81, -0.06], ["c", -0.54, 0.15, -0.99, 0.63, -1.17, 1.26], ["c", -0.06, 0.3, -0.12, 2.88, -0.06, 3.87], ["c", 0.03, 0.42, 0.03, 0.81, 0.06, 0.9], ["l", 0.03, 0.12], ["l", 0.45, -0.39], ["c", 0.63, -0.54, 1.26, -1.17, 1.56, -1.59], ["c", 0.3, -0.42, 0.6, -0.99, 0.72, -1.41], ["c", 0.18, -0.69, 0.09, -1.47, -0.18, -2.07], ["c", -0.15, -0.3, -0.33, -0.51, -0.6, -0.63], ["z"]],"w":6.75,"h":18.801},"accidentals.halfflat":{"d":[["M", 4.83, -14.07], ["c", 0.33, -0.06, 0.87, 0, 1.08, 0.15], ["c", 0.06, 0.03, 0.06, 0.6, -0.12, 9.06], ["c", -0.09, 5.55, -0.15, 9.06, -0.18, 9.12], ["c", -0.03, 0.09, -0.09, 0.18, -0.15, 0.27], ["c", -0.24, 0.21, -0.54, 0.24, -0.81, 0.06], ["c", -0.06, -0.03, -0.27, -0.24, -0.45, -0.42], ["c", -0.36, -0.42, -0.66, -0.66, -1.8, -1.44], ["c", -1.23, -0.84, -1.83, -1.32, -2.25, -1.77], ["c", -0.66, -0.78, -0.96, -1.56, -0.93, -2.46], ["c", 0.09, -1.41, 1.11, -2.58, 2.4, -2.79], ["c", 0.3, -0.06, 0.84, -0.03, 1.23, 0.06], ["c", 0.54, 0.12, 1.08, 0.33, 1.53, 0.63], ["c", 0.12, 0.09, 0.24, 0.15, 0.24, 0.12], ["c", 0, 0, -0.12, -8.37, -0.18, -9.75], ["l", 0, -0.66], ["l", 0.12, -0.06], ["c", 0.06, -0.03, 0.18, -0.09, 0.27, -0.12], ["z"], ["m", -1.65, 10.95], ["c", -0.6, -0.18, -1.08, 0.09, -1.38, 0.69], ["c", -0.27, 0.6, -0.36, 1.38, -0.18, 2.07], ["c", 0.12, 0.42, 0.42, 0.99, 0.72, 1.41], ["c", 0.3, 0.42, 0.93, 1.05, 1.56, 1.59], ["l", 0.48, 0.39], ["l", 0, -0.12], ["c", 0.03, -0.09, 0.03, -0.48, 0.06, -0.9], ["c", 0.03, -0.57, 0.03, -1.08, 0, -2.22], ["c", -0.03, -1.62, -0.03, -1.62, -0.24, -2.07], ["c", -0.21, -0.42, -0.6, -0.75, -1.02, -0.84], ["z"]],"w":6.728,"h":18.801},"accidentals.dblflat":{"d":[["M", -0.36, -14.07], ["c", 0.33, -0.06, 0.87, 0, 1.08, 0.15], ["c", 0.06, 0.03, 0.06, 0.33, -0.03, 4.89], ["c", -0.06, 2.67, -0.09, 5.01, -0.09, 5.22], ["l", 0, 0.36], ["l", 0.15, -0.15], ["c", 0.36, -0.3, 0.75, -0.51, 1.2, -0.63], ["c", 0.33, -0.09, 0.96, -0.09, 1.26, -0.03], ["c", 0.27, 0.09, 0.63, 0.27, 0.87, 0.45], ["l", 0.21, 0.15], ["l", 0, -0.27], ["c", 0, -0.15, -0.03, -2.43, -0.09, -5.1], ["c", -0.09, -4.56, -0.09, -4.86, -0.03, -4.89], ["c", 0.15, -0.12, 0.39, -0.15, 0.72, -0.15], ["c", 0.3, 0, 0.54, 0.03, 0.69, 0.15], ["c", 0.06, 0.03, 0.06, 0.33, -0.03, 4.95], ["c", -0.06, 2.7, -0.09, 5.04, -0.09, 5.22], ["l", 0.03, 0.3], ["l", 0.21, -0.15], ["c", 0.69, -0.48, 1.44, -0.69, 2.28, -0.69], ["c", 0.51, 0, 0.78, 0.03, 1.2, 0.21], ["c", 1.32, 0.63, 2.01, 2.28, 1.53, 3.69], ["c", -0.21, 0.57, -0.51, 1.02, -1.05, 1.56], ["c", -0.42, 0.42, -0.81, 0.72, -1.92, 1.5], ["c", -1.26, 0.87, -1.5, 1.08, -1.86, 1.5], ["c", -0.39, 0.45, -0.54, 0.54, -0.81, 0.51], ["c", -0.18, 0, -0.21, 0, -0.33, -0.06], ["l", -0.21, -0.21], ["l", -0.06, -0.12], ["l", -0.03, -0.99], ["c", -0.03, -0.54, -0.03, -1.29, -0.06, -1.68], ["l", 0, -0.69], ["l", -0.21, 0.24], ["c", -0.36, 0.42, -0.75, 0.75, -1.8, 1.62], ["c", -1.02, 0.84, -1.2, 0.99, -1.44, 1.38], ["c", -0.36, 0.51, -0.54, 0.6, -0.9, 0.51], ["c", -0.15, -0.03, -0.39, -0.27, -0.42, -0.42], ["c", -0.03, -0.06, -0.09, -3.27, -0.18, -8.34], ["c", -0.09, -4.53, -0.15, -8.58, -0.18, -9.03], ["l", 0, -0.78], ["l", 0.12, -0.06], ["c", 0.06, -0.03, 0.18, -0.09, 0.27, -0.12], ["z"], ["m", 2.52, 10.98], ["c", -0.18, -0.09, -0.48, -0.12, -0.66, -0.06], ["c", -0.39, 0.15, -0.69, 0.54, -0.84, 1.14], ["c", -0.06, 0.24, -0.06, 0.39, -0.09, 1.74], ["c", -0.03, 1.44, 0, 2.73, 0.06, 3.18], ["l", 0.03, 0.15], ["l", 0.27, -0.27], ["c", 0.93, -0.96, 1.5, -1.95, 1.74, -3.06], ["c", 0.06, -0.27, 0.06, -0.39, 0.06, -0.96], ["c", 0, -0.54, 0, -0.69, -0.06, -0.93], ["c", -0.09, -0.51, -0.27, -0.81, -0.51, -0.93], ["z"], ["m", 5.43, 0], ["c", -0.18, -0.09, -0.51, -0.12, -0.72, -0.06], ["c", -0.54, 0.12, -0.96, 0.63, -1.17, 1.26], ["c", -0.06, 0.3, -0.12, 2.88, -0.06, 3.9], ["c", 0.03, 0.42, 0.03, 0.81, 0.06, 0.9], ["l", 0.03, 0.12], ["l", 0.36, -0.3], ["c", 0.42, -0.36, 1.02, -0.96, 1.29, -1.29], ["c", 0.36, -0.45, 0.66, -0.99, 0.81, -1.41], ["c", 0.42, -1.23, 0.15, -2.76, -0.6, -3.12], ["z"]],"w":11.613,"h":18.804},"accidentals.dblsharp":{"d":[["M", -0.186, -3.96], ["c", 0.06, -0.03, 0.12, -0.06, 0.15, -0.06], ["c", 0.09, 0, 2.76, 0.27, 2.79, 0.3], ["c", 0.12, 0.03, 0.15, 0.12, 0.15, 0.51], ["c", 0.06, 0.96, 0.24, 1.59, 0.57, 2.1], ["c", 0.06, 0.09, 0.15, 0.21, 0.18, 0.24], ["l", 0.09, 0.06], ["l", 0.09, -0.06], ["c", 0.03, -0.03, 0.12, -0.15, 0.18, -0.24], ["c", 0.33, -0.51, 0.51, -1.14, 0.57, -2.1], ["c", 0, -0.39, 0.03, -0.45, 0.12, -0.51], ["c", 0.03, 0, 0.66, -0.09, 1.44, -0.15], ["c", 1.47, -0.15, 1.5, -0.15, 1.56, -0.03], ["c", 0.03, 0.06, 0, 0.42, -0.09, 1.44], ["c", -0.09, 0.72, -0.15, 1.35, -0.15, 1.38], ["c", 0, 0.03, -0.03, 0.09, -0.06, 0.12], ["c", -0.06, 0.06, -0.12, 0.09, -0.51, 0.09], ["c", -1.08, 0.06, -1.8, 0.3, -2.28, 0.75], ["l", -0.12, 0.09], ["l", 0.09, 0.09], ["c", 0.12, 0.15, 0.39, 0.33, 0.63, 0.45], ["c", 0.42, 0.18, 0.96, 0.27, 1.68, 0.33], ["c", 0.39, -0, 0.45, 0.03, 0.51, 0.09], ["c", 0.03, 0.03, 0.06, 0.09, 0.06, 0.12], ["c", 0, 0.03, 0.06, 0.66, 0.15, 1.38], ["c", 0.09, 1.02, 0.12, 1.38, 0.09, 1.44], ["c", -0.06, 0.12, -0.09, 0.12, -1.56, -0.03], ["c", -0.78, -0.06, -1.41, -0.15, -1.44, -0.15], ["c", -0.09, -0.06, -0.12, -0.12, -0.12, -0.54], ["c", -0.06, -0.93, -0.24, -1.56, -0.57, -2.07], ["c", -0.06, -0.09, -0.15, -0.21, -0.18, -0.24], ["l", -0.09, -0.06], ["l", -0.09, 0.06], ["c", -0.03, 0.03, -0.12, 0.15, -0.18, 0.24], ["c", -0.33, 0.51, -0.51, 1.14, -0.57, 2.07], ["c", 0, 0.42, -0.03, 0.48, -0.12, 0.54], ["c", -0.03, 0, -0.66, 0.09, -1.44, 0.15], ["c", -1.47, 0.15, -1.5, 0.15, -1.56, 0.03], ["c", -0.03, -0.06, 0, -0.42, 0.09, -1.44], ["c", 0.09, -0.72, 0.15, -1.35, 0.15, -1.38], ["c", 0, -0.03, 0.03, -0.09, 0.06, -0.12], ["c", 0.06, -0.06, 0.12, -0.09, 0.51, -0.09], ["c", 0.72, -0.06, 1.26, -0.15, 1.68, -0.33], ["c", 0.24, -0.12, 0.51, -0.3, 0.63, -0.45], ["l", 0.09, -0.09], ["l", -0.12, -0.09], ["c", -0.48, -0.45, -1.2, -0.69, -2.28, -0.75], ["c", -0.39, 0, -0.45, -0.03, -0.51, -0.09], ["c", -0.03, -0.03, -0.06, -0.09, -0.06, -0.12], ["c", 0, -0.03, -0.06, -0.63, -0.12, -1.38], ["c", -0.09, -0.72, -0.15, -1.35, -0.15, -1.38], ["z"]],"w":7.961,"h":7.977},"dots.dot":{"d":[["M", 1.32, -1.68], ["c", 0.09, -0.03, 0.27, -0.06, 0.39, -0.06], ["c", 0.96, 0, 1.74, 0.78, 1.74, 1.71], ["c", 0, 0.96, -0.78, 1.74, -1.71, 1.74], ["c", -0.96, 0, -1.74, -0.78, -1.74, -1.71], ["c", 0, -0.78, 0.54, -1.5, 1.32, -1.68], ["z"]],"w":3.45,"h":3.45},"noteheads.dbl":{"d":[["M", -0.69, -4.02], ["c", 0.18, -0.09, 0.36, -0.09, 0.54, 0], ["c", 0.18, 0.09, 0.24, 0.15, 0.33, 0.3], ["c", 0.06, 0.15, 0.06, 0.18, 0.06, 1.41], ["l", -0, 1.23], ["l", 0.12, -0.18], ["c", 0.72, -1.26, 2.64, -2.31, 4.86, -2.64], ["c", 0.81, -0.15, 1.11, -0.15, 2.13, -0.15], ["c", 0.99, 0, 1.29, 0, 2.1, 0.15], ["c", 0.75, 0.12, 1.38, 0.27, 2.04, 0.54], ["c", 1.35, 0.51, 2.34, 1.26, 2.82, 2.1], ["l", 0.12, 0.18], ["l", 0, -1.23], ["c", 0, -1.2, 0, -1.26, 0.06, -1.38], ["c", 0.09, -0.18, 0.15, -0.24, 0.33, -0.33], ["c", 0.18, -0.09, 0.36, -0.09, 0.54, 0], ["c", 0.18, 0.09, 0.24, 0.15, 0.33, 0.3], ["l", 0.06, 0.15], ["l", 0, 3.54], ["l", 0, 3.54], ["l", -0.06, 0.15], ["c", -0.09, 0.18, -0.15, 0.24, -0.33, 0.33], ["c", -0.18, 0.09, -0.36, 0.09, -0.54, 0], ["c", -0.18, -0.09, -0.24, -0.15, -0.33, -0.33], ["c", -0.06, -0.12, -0.06, -0.18, -0.06, -1.38], ["l", 0, -1.23], ["l", -0.12, 0.18], ["c", -0.48, 0.84, -1.47, 1.59, -2.82, 2.1], ["c", -0.84, 0.33, -1.71, 0.54, -2.85, 0.66], ["c", -0.45, 0.06, -2.16, 0.06, -2.61, 0], ["c", -1.14, -0.12, -2.01, -0.33, -2.85, -0.66], ["c", -1.35, -0.51, -2.34, -1.26, -2.82, -2.1], ["l", -0.12, -0.18], ["l", 0, 1.23], ["c", 0, 1.23, 0, 1.26, -0.06, 1.38], ["c", -0.09, 0.18, -0.15, 0.24, -0.33, 0.33], ["c", -0.18, 0.09, -0.36, 0.09, -0.54, 0], ["c", -0.18, -0.09, -0.24, -0.15, -0.33, -0.33], ["l", -0.06, -0.15], ["l", 0, -3.54], ["c", 0, -3.48, 0, -3.54, 0.06, -3.66], ["c", 0.09, -0.18, 0.15, -0.24, 0.33, -0.33], ["z"], ["m", 7.71, 0.63], ["c", -0.36, -0.06, -0.9, -0.06, -1.14, 0], ["c", -0.3, 0.03, -0.66, 0.24, -0.87, 0.42], ["c", -0.6, 0.54, -0.9, 1.62, -0.75, 2.82], ["c", 0.12, 0.93, 0.51, 1.68, 1.11, 2.31], ["c", 0.75, 0.72, 1.83, 1.2, 2.85, 1.26], ["c", 1.05, 0.06, 1.83, -0.54, 2.1, -1.65], ["c", 0.21, -0.9, 0.12, -1.95, -0.24, -2.82], ["c", -0.36, -0.81, -1.08, -1.53, -1.95, -1.95], ["c", -0.3, -0.15, -0.78, -0.3, -1.11, -0.39], ["z"]],"w":16.83,"h":8.145},"noteheads.whole":{"d":[["M", 6.51, -4.05], ["c", 0.51, -0.03, 2.01, 0, 2.52, 0.03], ["c", 1.41, 0.18, 2.64, 0.51, 3.72, 1.08], ["c", 1.2, 0.63, 1.95, 1.41, 2.19, 2.31], ["c", 0.09, 0.33, 0.09, 0.9, -0, 1.23], ["c", -0.24, 0.9, -0.99, 1.68, -2.19, 2.31], ["c", -1.08, 0.57, -2.28, 0.9, -3.75, 1.08], ["c", -0.66, 0.06, -2.31, 0.06, -2.97, 0], ["c", -1.47, -0.18, -2.67, -0.51, -3.75, -1.08], ["c", -1.2, -0.63, -1.95, -1.41, -2.19, -2.31], ["c", -0.09, -0.33, -0.09, -0.9, -0, -1.23], ["c", 0.24, -0.9, 0.99, -1.68, 2.19, -2.31], ["c", 1.2, -0.63, 2.61, -0.99, 4.23, -1.11], ["z"], ["m", 0.57, 0.66], ["c", -0.87, -0.15, -1.53, 0, -2.04, 0.51], ["c", -0.15, 0.15, -0.24, 0.27, -0.33, 0.48], ["c", -0.24, 0.51, -0.36, 1.08, -0.33, 1.77], ["c", 0.03, 0.69, 0.18, 1.26, 0.42, 1.77], ["c", 0.6, 1.17, 1.74, 1.98, 3.18, 2.22], ["c", 1.11, 0.21, 1.95, -0.15, 2.34, -0.99], ["c", 0.24, -0.51, 0.36, -1.08, 0.33, -1.8], ["c", -0.06, -1.11, -0.45, -2.04, -1.17, -2.76], ["c", -0.63, -0.63, -1.47, -1.05, -2.4, -1.2], ["z"]],"w":14.985,"h":8.097},"noteheads.half":{"d":[["M", 7.44, -4.05], ["c", 0.06, -0.03, 0.27, -0.03, 0.48, -0.03], ["c", 1.05, 0, 1.71, 0.24, 2.1, 0.81], ["c", 0.42, 0.6, 0.45, 1.35, 0.18, 2.4], ["c", -0.42, 1.59, -1.14, 2.73, -2.16, 3.39], ["c", -1.41, 0.93, -3.18, 1.44, -5.4, 1.53], ["c", -1.17, 0.03, -1.89, -0.21, -2.28, -0.81], ["c", -0.42, -0.6, -0.45, -1.35, -0.18, -2.4], ["c", 0.42, -1.59, 1.14, -2.73, 2.16, -3.39], ["c", 0.63, -0.42, 1.23, -0.72, 1.98, -0.96], ["c", 0.9, -0.3, 1.65, -0.42, 3.12, -0.54], ["z"], ["m", 1.29, 0.87], ["c", -0.27, -0.09, -0.63, -0.12, -0.9, -0.03], ["c", -0.72, 0.24, -1.53, 0.69, -3.27, 1.8], ["c", -2.34, 1.5, -3.3, 2.25, -3.57, 2.79], ["c", -0.36, 0.72, -0.06, 1.5, 0.66, 1.77], ["c", 0.24, 0.12, 0.69, 0.09, 0.99, 0], ["c", 0.84, -0.3, 1.92, -0.93, 4.14, -2.37], ["c", 1.62, -1.08, 2.37, -1.71, 2.61, -2.19], ["c", 0.36, -0.72, 0.06, -1.5, -0.66, -1.77], ["z"]],"w":10.37,"h":8.132},"noteheads.quarter":{"d":[["M", 6.09, -4.05], ["c", 0.36, -0.03, 1.2, 0, 1.53, 0.06], ["c", 1.17, 0.24, 1.89, 0.84, 2.16, 1.83], ["c", 0.06, 0.18, 0.06, 0.3, 0.06, 0.66], ["c", 0, 0.45, 0, 0.63, -0.15, 1.08], ["c", -0.66, 2.04, -3.06, 3.93, -5.52, 4.38], ["c", -0.54, 0.09, -1.44, 0.09, -1.83, 0.03], ["c", -1.23, -0.27, -1.98, -0.87, -2.25, -1.86], ["c", -0.06, -0.18, -0.06, -0.3, -0.06, -0.66], ["c", 0, -0.45, 0, -0.63, 0.15, -1.08], ["c", 0.24, -0.78, 0.75, -1.53, 1.44, -2.22], ["c", 1.2, -1.2, 2.85, -2.01, 4.47, -2.22], ["z"]],"w":9.81,"h":8.094},"scripts.ufermata":{"d":[["M", -0.75, -10.77], ["c", 0.12, 0, 0.45, -0.03, 0.69, -0.03], ["c", 2.91, -0.03, 5.55, 1.53, 7.41, 4.35], ["c", 1.17, 1.71, 1.95, 3.72, 2.43, 6.03], ["c", 0.12, 0.51, 0.12, 0.57, 0.03, 0.69], ["c", -0.12, 0.21, -0.48, 0.27, -0.69, 0.12], ["c", -0.12, -0.09, -0.18, -0.24, -0.27, -0.69], ["c", -0.78, -3.63, -3.42, -6.54, -6.78, -7.38], ["c", -0.78, -0.21, -1.2, -0.24, -2.07, -0.24], ["c", -0.63, -0, -0.84, -0, -1.2, 0.06], ["c", -1.83, 0.27, -3.42, 1.08, -4.8, 2.37], ["c", -1.41, 1.35, -2.4, 3.21, -2.85, 5.19], ["c", -0.09, 0.45, -0.15, 0.6, -0.27, 0.69], ["c", -0.21, 0.15, -0.57, 0.09, -0.69, -0.12], ["c", -0.09, -0.12, -0.09, -0.18, 0.03, -0.69], ["c", 0.33, -1.62, 0.78, -3, 1.47, -4.38], ["c", 1.77, -3.54, 4.44, -5.67, 7.56, -5.97], ["z"], ["m", 0.33, 7.47], ["c", 1.38, -0.3, 2.58, 0.9, 2.31, 2.25], ["c", -0.15, 0.72, -0.78, 1.35, -1.47, 1.5], ["c", -1.38, 0.27, -2.58, -0.93, -2.31, -2.31], ["c", 0.15, -0.69, 0.78, -1.29, 1.47, -1.44], ["z"]],"w":19.748,"h":11.289},"scripts.dfermata":{"d":[["M", -9.63, -0.42], ["c", 0.15, -0.09, 0.36, -0.06, 0.51, 0.03], ["c", 0.12, 0.09, 0.18, 0.24, 0.27, 0.66], ["c", 0.78, 3.66, 3.42, 6.57, 6.78, 7.41], ["c", 0.78, 0.21, 1.2, 0.24, 2.07, 0.24], ["c", 0.63, -0, 0.84, -0, 1.2, -0.06], ["c", 1.83, -0.27, 3.42, -1.08, 4.8, -2.37], ["c", 1.41, -1.35, 2.4, -3.21, 2.85, -5.22], ["c", 0.09, -0.42, 0.15, -0.57, 0.27, -0.66], ["c", 0.21, -0.15, 0.57, -0.09, 0.69, 0.12], ["c", 0.09, 0.12, 0.09, 0.18, -0.03, 0.69], ["c", -0.33, 1.62, -0.78, 3, -1.47, 4.38], ["c", -1.92, 3.84, -4.89, 6, -8.31, 6], ["c", -3.42, 0, -6.39, -2.16, -8.31, -6], ["c", -0.48, -0.96, -0.84, -1.92, -1.14, -2.97], ["c", -0.18, -0.69, -0.42, -1.74, -0.42, -1.92], ["c", 0, -0.12, 0.09, -0.27, 0.24, -0.33], ["z"], ["m", 9.21, 0], ["c", 1.2, -0.27, 2.34, 0.63, 2.34, 1.86], ["c", -0, 0.9, -0.66, 1.68, -1.5, 1.89], ["c", -1.38, 0.27, -2.58, -0.93, -2.31, -2.31], ["c", 0.15, -0.69, 0.78, -1.29, 1.47, -1.44], ["z"]],"w":19.744,"h":11.274},"scripts.sforzato":{"d":[["M", -6.45, -3.69], ["c", 0.06, -0.03, 0.15, -0.06, 0.18, -0.06], ["c", 0.06, 0, 2.85, 0.72, 6.24, 1.59], ["l", 6.33, 1.65], ["c", 0.33, 0.06, 0.45, 0.21, 0.45, 0.51], ["c", 0, 0.3, -0.12, 0.45, -0.45, 0.51], ["l", -6.33, 1.65], ["c", -3.39, 0.87, -6.18, 1.59, -6.21, 1.59], ["c", -0.21, -0, -0.48, -0.24, -0.51, -0.45], ["c", 0, -0.15, 0.06, -0.36, 0.18, -0.45], ["c", 0.09, -0.06, 0.87, -0.27, 3.84, -1.05], ["c", 2.04, -0.54, 3.84, -0.99, 4.02, -1.02], ["c", 0.15, -0.06, 1.14, -0.24, 2.22, -0.42], ["c", 1.05, -0.18, 1.92, -0.36, 1.92, -0.36], ["c", 0, -0, -0.87, -0.18, -1.92, -0.36], ["c", -1.08, -0.18, -2.07, -0.36, -2.22, -0.42], ["c", -0.18, -0.03, -1.98, -0.48, -4.02, -1.02], ["c", -2.97, -0.78, -3.75, -0.99, -3.84, -1.05], ["c", -0.12, -0.09, -0.18, -0.3, -0.18, -0.45], ["c", 0.03, -0.15, 0.15, -0.3, 0.3, -0.39], ["z"]],"w":13.5,"h":7.5},"scripts.staccato":{"d":[["M", -0.36, -1.47], ["c", 0.93, -0.21, 1.86, 0.51, 1.86, 1.47], ["c", -0, 0.93, -0.87, 1.65, -1.8, 1.47], ["c", -0.54, -0.12, -1.02, -0.57, -1.14, -1.08], ["c", -0.21, -0.81, 0.27, -1.65, 1.08, -1.86], ["z"]],"w":2.989,"h":3.004},"scripts.tenuto":{"d":[["M", -4.2, -0.48], ["l", 0.12, -0.06], ["l", 4.08, 0], ["l", 4.08, 0], ["l", 0.12, 0.06], ["c", 0.39, 0.21, 0.39, 0.75, 0, 0.96], ["l", -0.12, 0.06], ["l", -4.08, 0], ["l", -4.08, 0], ["l", -0.12, -0.06], ["c", -0.39, -0.21, -0.39, -0.75, 0, -0.96], ["z"]],"w":8.985,"h":1.08},"scripts.umarcato":{"d":[["M", -0.15, -8.19], ["c", 0.15, -0.12, 0.36, -0.03, 0.45, 0.15], ["c", 0.21, 0.42, 3.45, 7.65, 3.45, 7.71], ["c", -0, 0.12, -0.12, 0.27, -0.21, 0.3], ["c", -0.03, 0.03, -0.51, 0.03, -1.14, 0.03], ["c", -1.05, 0, -1.08, 0, -1.17, -0.06], ["c", -0.09, -0.06, -0.24, -0.36, -1.17, -2.4], ["c", -0.57, -1.29, -1.05, -2.34, -1.08, -2.34], ["c", -0, -0.03, -0.51, 1.02, -1.08, 2.34], ["c", -0.93, 2.07, -1.08, 2.34, -1.14, 2.4], ["c", -0.06, 0.03, -0.15, 0.06, -0.18, 0.06], ["c", -0.15, 0, -0.33, -0.18, -0.33, -0.33], ["c", -0, -0.06, 3.24, -7.32, 3.45, -7.71], ["c", 0.03, -0.06, 0.09, -0.15, 0.15, -0.15], ["z"]],"w":7.5,"h":8.245},"scripts.dmarcato":{"d":[["M", -3.57, 0.03], ["c", 0.03, 0, 0.57, -0.03, 1.17, -0.03], ["c", 1.05, 0, 1.08, 0, 1.17, 0.06], ["c", 0.09, 0.06, 0.24, 0.36, 1.17, 2.4], ["c", 0.57, 1.29, 1.05, 2.34, 1.08, 2.34], ["c", 0, 0.03, 0.51, -1.02, 1.08, -2.34], ["c", 0.93, -2.07, 1.08, -2.34, 1.14, -2.4], ["c", 0.06, -0.03, 0.15, -0.06, 0.18, -0.06], ["c", 0.15, 0, 0.33, 0.18, 0.33, 0.33], ["c", 0, 0.09, -3.45, 7.74, -3.54, 7.83], ["c", -0.12, 0.12, -0.3, 0.12, -0.42, 0], ["c", -0.09, -0.09, -3.54, -7.74, -3.54, -7.83], ["c", 0, -0.09, 0.12, -0.27, 0.18, -0.3], ["z"]],"w":7.5,"h":8.25},"scripts.stopped":{"d":[["M", -0.27, -4.08], ["c", 0.18, -0.09, 0.36, -0.09, 0.54, 0], ["c", 0.18, 0.09, 0.24, 0.15, 0.33, 0.3], ["l", 0.06, 0.15], ["l", -0, 1.5], ["l", -0, 1.47], ["l", 1.47, 0], ["l", 1.5, 0], ["l", 0.15, 0.06], ["c", 0.15, 0.09, 0.21, 0.15, 0.3, 0.33], ["c", 0.09, 0.18, 0.09, 0.36, -0, 0.54], ["c", -0.09, 0.18, -0.15, 0.24, -0.33, 0.33], ["c", -0.12, 0.06, -0.18, 0.06, -1.62, 0.06], ["l", -1.47, 0], ["l", -0, 1.47], ["l", -0, 1.47], ["l", -0.06, 0.15], ["c", -0.09, 0.18, -0.15, 0.24, -0.33, 0.33], ["c", -0.18, 0.09, -0.36, 0.09, -0.54, 0], ["c", -0.18, -0.09, -0.24, -0.15, -0.33, -0.33], ["l", -0.06, -0.15], ["l", -0, -1.47], ["l", -0, -1.47], ["l", -1.47, 0], ["c", -1.44, 0, -1.5, 0, -1.62, -0.06], ["c", -0.18, -0.09, -0.24, -0.15, -0.33, -0.33], ["c", -0.09, -0.18, -0.09, -0.36, -0, -0.54], ["c", 0.09, -0.18, 0.15, -0.24, 0.33, -0.33], ["l", 0.15, -0.06], ["l", 1.47, 0], ["l", 1.47, 0], ["l", -0, -1.47], ["c", -0, -1.44, -0, -1.5, 0.06, -1.62], ["c", 0.09, -0.18, 0.15, -0.24, 0.33, -0.33], ["z"]],"w":8.295,"h":8.295},"scripts.upbow":{"d":[["M", -4.65, -15.54], ["c", 0.12, -0.09, 0.36, -0.06, 0.48, 0.03], ["c", 0.03, 0.03, 0.09, 0.09, 0.12, 0.15], ["c", 0.03, 0.06, 0.66, 2.13, 1.41, 4.62], ["c", 1.35, 4.41, 1.38, 4.56, 2.01, 6.96], ["l", 0.63, 2.46], ["l", 0.63, -2.46], ["c", 0.63, -2.4, 0.66, -2.55, 2.01, -6.96], ["c", 0.75, -2.49, 1.38, -4.56, 1.41, -4.62], ["c", 0.06, -0.15, 0.18, -0.21, 0.36, -0.24], ["c", 0.15, 0, 0.3, 0.06, 0.39, 0.18], ["c", 0.15, 0.21, 0.24, -0.18, -2.1, 7.56], ["c", -1.2, 3.96, -2.22, 7.32, -2.25, 7.41], ["c", 0, 0.12, -0.06, 0.27, -0.09, 0.3], ["c", -0.12, 0.21, -0.6, 0.21, -0.72, 0], ["c", -0.03, -0.03, -0.09, -0.18, -0.09, -0.3], ["c", -0.03, -0.09, -1.05, -3.45, -2.25, -7.41], ["c", -2.34, -7.74, -2.25, -7.35, -2.1, -7.56], ["c", 0.03, -0.03, 0.09, -0.09, 0.15, -0.12], ["z"]],"w":9.73,"h":15.608},"scripts.downbow":{"d":[["M", -5.55, -9.93], ["l", 0.09, -0.06], ["l", 5.46, 0], ["l", 5.46, 0], ["l", 0.09, 0.06], ["l", 0.06, 0.09], ["l", 0, 4.77], ["c", 0, 5.28, 0, 4.89, -0.18, 5.01], ["c", -0.18, 0.12, -0.42, 0.06, -0.54, -0.12], ["c", -0.06, -0.09, -0.06, -0.18, -0.06, -2.97], ["l", 0, -2.85], ["l", -4.83, 0], ["l", -4.83, 0], ["l", 0, 2.85], ["c", 0, 2.79, 0, 2.88, -0.06, 2.97], ["c", -0.15, 0.24, -0.51, 0.24, -0.66, 0], ["c", -0.06, -0.09, -0.06, -0.21, -0.06, -4.89], ["l", 0, -4.77], ["z"]],"w":11.22,"h":9.992},"scripts.turn":{"d":[["M", -4.77, -3.9], ["c", 0.36, -0.06, 1.05, -0.06, 1.44, 0.03], ["c", 0.78, 0.15, 1.5, 0.51, 2.34, 1.14], ["c", 0.6, 0.45, 1.05, 0.87, 2.22, 2.01], ["c", 1.11, 1.08, 1.62, 1.5, 2.22, 1.86], ["c", 0.6, 0.36, 1.32, 0.57, 1.92, 0.57], ["c", 0.9, -0, 1.71, -0.57, 1.89, -1.35], ["c", 0.24, -0.93, -0.39, -1.89, -1.35, -2.1], ["l", -0.15, -0.06], ["l", -0.09, 0.15], ["c", -0.03, 0.09, -0.15, 0.24, -0.24, 0.33], ["c", -0.72, 0.72, -2.04, 0.54, -2.49, -0.36], ["c", -0.48, -0.93, 0.03, -1.86, 1.17, -2.19], ["c", 0.3, -0.09, 1.02, -0.09, 1.35, -0], ["c", 0.99, 0.27, 1.74, 0.87, 2.25, 1.83], ["c", 0.69, 1.41, 0.63, 3, -0.21, 4.26], ["c", -0.21, 0.3, -0.69, 0.81, -0.99, 1.02], ["c", -0.3, 0.21, -0.84, 0.45, -1.17, 0.54], ["c", -1.23, 0.36, -2.49, 0.15, -3.72, -0.6], ["c", -0.75, -0.48, -1.41, -1.02, -2.85, -2.46], ["c", -1.11, -1.08, -1.62, -1.5, -2.22, -1.86], ["c", -0.6, -0.36, -1.32, -0.57, -1.92, -0.57], ["c", -0.9, 0, -1.71, 0.57, -1.89, 1.35], ["c", -0.24, 0.93, 0.39, 1.89, 1.35, 2.1], ["l", 0.15, 0.06], ["l", 0.09, -0.15], ["c", 0.03, -0.09, 0.15, -0.24, 0.24, -0.33], ["c", 0.72, -0.72, 2.04, -0.54, 2.49, 0.36], ["c", 0.48, 0.93, -0.03, 1.86, -1.17, 2.19], ["c", -0.3, 0.09, -1.02, 0.09, -1.35, 0], ["c", -0.99, -0.27, -1.74, -0.87, -2.25, -1.83], ["c", -0.69, -1.41, -0.63, -3, 0.21, -4.26], ["c", 0.21, -0.3, 0.69, -0.81, 0.99, -1.02], ["c", 0.48, -0.33, 1.11, -0.57, 1.74, -0.66], ["z"]],"w":16.366,"h":7.893},"scripts.trill":{"d":[["M", -0.51, -16.02], ["c", 0.12, -0.09, 0.21, -0.18, 0.21, -0.18], ["l", -0.81, 4.02], ["l", -0.81, 4.02], ["c", 0.03, 0, 0.51, -0.27, 1.08, -0.6], ["c", 0.6, -0.3, 1.14, -0.63, 1.26, -0.66], ["c", 1.14, -0.54, 2.31, -0.6, 3.09, -0.18], ["c", 0.27, 0.15, 0.54, 0.36, 0.6, 0.51], ["l", 0.06, 0.12], ["l", 0.21, -0.21], ["c", 0.9, -0.81, 2.22, -0.99, 3.12, -0.42], ["c", 0.6, 0.42, 0.9, 1.14, 0.78, 2.07], ["c", -0.15, 1.29, -1.05, 2.31, -1.95, 2.25], ["c", -0.48, -0.03, -0.78, -0.3, -0.96, -0.81], ["c", -0.09, -0.27, -0.09, -0.9, -0.03, -1.2], ["c", 0.21, -0.75, 0.81, -1.23, 1.59, -1.32], ["l", 0.24, -0.03], ["l", -0.09, -0.12], ["c", -0.51, -0.66, -1.62, -0.63, -2.31, 0.03], ["c", -0.39, 0.42, -0.3, 0.09, -1.23, 4.77], ["l", -0.81, 4.14], ["c", -0.03, 0, -0.12, -0.03, -0.21, -0.09], ["c", -0.33, -0.15, -0.54, -0.18, -0.99, -0.18], ["c", -0.42, 0, -0.66, 0.03, -1.05, 0.18], ["c", -0.12, 0.06, -0.21, 0.09, -0.21, 0.09], ["c", 0, -0.03, 0.36, -1.86, 0.81, -4.11], ["c", 0.9, -4.47, 0.87, -4.26, 0.69, -4.53], ["c", -0.21, -0.36, -0.66, -0.51, -1.17, -0.36], ["c", -0.15, 0.06, -2.22, 1.14, -2.58, 1.38], ["c", -0.12, 0.09, -0.12, 0.09, -0.21, 0.6], ["l", -0.09, 0.51], ["l", 0.21, 0.24], ["c", 0.63, 0.75, 1.02, 1.47, 1.2, 2.19], ["c", 0.06, 0.27, 0.06, 0.36, 0.06, 0.81], ["c", 0, 0.42, 0, 0.54, -0.06, 0.78], ["c", -0.15, 0.54, -0.33, 0.93, -0.63, 1.35], ["c", -0.18, 0.24, -0.57, 0.63, -0.81, 0.78], ["c", -0.24, 0.15, -0.63, 0.36, -0.84, 0.42], ["c", -0.27, 0.06, -0.66, 0.06, -0.87, 0.03], ["c", -0.81, -0.18, -1.32, -1.05, -1.38, -2.46], ["c", -0.03, -0.6, 0.03, -0.99, 0.33, -2.46], ["c", 0.21, -1.08, 0.24, -1.32, 0.21, -1.29], ["c", -1.2, 0.48, -2.4, 0.75, -3.21, 0.72], ["c", -0.69, -0.06, -1.17, -0.3, -1.41, -0.72], ["c", -0.39, -0.75, -0.12, -1.8, 0.66, -2.46], ["c", 0.24, -0.18, 0.69, -0.42, 1.02, -0.51], ["c", 0.69, -0.18, 1.53, -0.15, 2.31, 0.09], ["c", 0.3, 0.09, 0.75, 0.3, 0.99, 0.45], ["c", 0.12, 0.09, 0.15, 0.09, 0.15, 0.03], ["c", 0.03, -0.03, 0.33, -1.59, 0.72, -3.45], ["c", 0.36, -1.86, 0.66, -3.42, 0.69, -3.45], ["c", 0, -0.03, 0.03, -0.03, 0.21, 0.03], ["c", 0.21, 0.06, 0.27, 0.06, 0.48, 0.06], ["c", 0.42, -0.03, 0.78, -0.18, 1.26, -0.48], ["c", 0.15, -0.12, 0.36, -0.27, 0.48, -0.39], ["z"], ["m", -5.73, 7.68], ["c", -0.27, -0.03, -0.96, -0.06, -1.2, -0.03], ["c", -0.81, 0.12, -1.35, 0.57, -1.5, 1.2], ["c", -0.18, 0.66, 0.12, 1.14, 0.75, 1.29], ["c", 0.66, 0.12, 1.92, -0.12, 3.18, -0.66], ["l", 0.33, -0.15], ["l", 0.09, -0.39], ["c", 0.06, -0.21, 0.09, -0.42, 0.09, -0.45], ["c", 0, -0.03, -0.45, -0.3, -0.75, -0.45], ["c", -0.27, -0.15, -0.66, -0.27, -0.99, -0.36], ["z"], ["m", 4.29, 3.63], ["c", -0.24, -0.39, -0.51, -0.75, -0.51, -0.69], ["c", -0.06, 0.12, -0.39, 1.92, -0.45, 2.28], ["c", -0.09, 0.54, -0.12, 1.14, -0.06, 1.38], ["c", 0.06, 0.42, 0.21, 0.6, 0.51, 0.57], ["c", 0.39, -0.06, 0.75, -0.48, 0.93, -1.14], ["c", 0.09, -0.33, 0.09, -1.05, -0, -1.38], ["c", -0.09, -0.39, -0.24, -0.69, -0.42, -1.02], ["z"]],"w":17.963,"h":16.49},"scripts.segno":{"d":[["M", -3.72, -11.22], ["c", 0.78, -0.09, 1.59, 0.03, 2.31, 0.42], ["c", 1.2, 0.6, 2.01, 1.71, 2.31, 3.09], ["c", 0.09, 0.42, 0.09, 1.2, 0.03, 1.5], ["c", -0.15, 0.45, -0.39, 0.81, -0.66, 0.93], ["c", -0.33, 0.18, -0.84, 0.21, -1.23, 0.15], ["c", -0.81, -0.18, -1.32, -0.93, -1.26, -1.89], ["c", 0.03, -0.36, 0.09, -0.57, 0.24, -0.9], ["c", 0.15, -0.33, 0.45, -0.6, 0.72, -0.75], ["c", 0.12, -0.06, 0.18, -0.09, 0.18, -0.12], ["c", 0, -0.03, -0.03, -0.15, -0.09, -0.24], ["c", -0.18, -0.45, -0.54, -0.87, -0.96, -1.08], ["c", -1.11, -0.57, -2.34, -0.18, -2.88, 0.9], ["c", -0.24, 0.51, -0.33, 1.11, -0.24, 1.83], ["c", 0.27, 1.92, 1.5, 3.54, 3.93, 5.13], ["c", 0.48, 0.33, 1.26, 0.78, 1.29, 0.78], ["c", 0.03, 0, 1.35, -2.19, 2.94, -4.89], ["l", 2.88, -4.89], ["l", 0.84, 0], ["l", 0.87, 0], ["l", -0.03, 0.06], ["c", -0.15, 0.21, -6.15, 10.41, -6.15, 10.44], ["c", 0, 0, 0.21, 0.15, 0.48, 0.27], ["c", 2.61, 1.47, 4.35, 3.03, 5.13, 4.65], ["c", 1.14, 2.34, 0.51, 5.07, -1.44, 6.39], ["c", -0.66, 0.42, -1.32, 0.63, -2.13, 0.69], ["c", -2.01, 0.09, -3.81, -1.41, -4.26, -3.54], ["c", -0.09, -0.42, -0.09, -1.2, -0.03, -1.5], ["c", 0.15, -0.45, 0.39, -0.81, 0.66, -0.93], ["c", 0.33, -0.18, 0.84, -0.21, 1.23, -0.15], ["c", 0.81, 0.18, 1.32, 0.93, 1.26, 1.89], ["c", -0.03, 0.36, -0.09, 0.57, -0.24, 0.9], ["c", -0.15, 0.33, -0.45, 0.6, -0.72, 0.75], ["c", -0.12, 0.06, -0.18, 0.09, -0.18, 0.12], ["c", 0, 0.03, 0.03, 0.15, 0.09, 0.24], ["c", 0.18, 0.45, 0.54, 0.87, 0.96, 1.08], ["c", 1.11, 0.57, 2.34, 0.18, 2.88, -0.9], ["c", 0.24, -0.51, 0.33, -1.11, 0.24, -1.83], ["c", -0.27, -1.92, -1.5, -3.54, -3.93, -5.13], ["c", -0.48, -0.33, -1.26, -0.78, -1.29, -0.78], ["c", -0.03, 0, -1.35, 2.19, -2.91, 4.89], ["l", -2.88, 4.89], ["l", -0.87, 0], ["l", -0.87, 0], ["l", 0.03, -0.06], ["c", 0.15, -0.21, 6.15, -10.41, 6.15, -10.44], ["c", 0, 0, -0.21, -0.15, -0.48, -0.3], ["c", -2.61, -1.44, -4.35, -3, -5.13, -4.62], ["c", -0.9, -1.89, -0.72, -4.02, 0.48, -5.52], ["c", 0.69, -0.84, 1.68, -1.41, 2.73, -1.53], ["z"], ["m", 8.76, 9.09], ["c", 0.03, -0.03, 0.15, -0.03, 0.27, -0.03], ["c", 0.33, 0.03, 0.57, 0.18, 0.72, 0.48], ["c", 0.09, 0.18, 0.09, 0.57, 0, 0.75], ["c", -0.09, 0.18, -0.21, 0.3, -0.36, 0.39], ["c", -0.15, 0.06, -0.21, 0.06, -0.39, 0.06], ["c", -0.21, 0, -0.27, 0, -0.39, -0.06], ["c", -0.3, -0.15, -0.48, -0.45, -0.48, -0.75], ["c", 0, -0.39, 0.24, -0.72, 0.63, -0.84], ["z"], ["m", -10.53, 2.61], ["c", 0.03, -0.03, 0.15, -0.03, 0.27, -0.03], ["c", 0.33, 0.03, 0.57, 0.18, 0.72, 0.48], ["c", 0.09, 0.18, 0.09, 0.57, 0, 0.75], ["c", -0.09, 0.18, -0.21, 0.3, -0.36, 0.39], ["c", -0.15, 0.06, -0.21, 0.06, -0.39, 0.06], ["c", -0.21, 0, -0.27, 0, -0.39, -0.06], ["c", -0.3, -0.15, -0.48, -0.45, -0.48, -0.75], ["c", 0, -0.39, 0.24, -0.72, 0.63, -0.84], ["z"]],"w":15,"h":22.504},"scripts.coda":{"d":[["M", -0.21, -10.47], ["c", 0.18, -0.12, 0.42, -0.06, 0.54, 0.12], ["c", 0.06, 0.09, 0.06, 0.18, 0.06, 1.5], ["l", 0, 1.38], ["l", 0.18, 0], ["c", 0.39, 0.06, 0.96, 0.24, 1.38, 0.48], ["c", 1.68, 0.93, 2.82, 3.24, 3.03, 6.12], ["c", 0.03, 0.24, 0.03, 0.45, 0.03, 0.45], ["c", 0, 0.03, 0.6, 0.03, 1.35, 0.03], ["c", 1.5, 0, 1.47, 0, 1.59, 0.18], ["c", 0.09, 0.12, 0.09, 0.3, -0, 0.42], ["c", -0.12, 0.18, -0.09, 0.18, -1.59, 0.18], ["c", -0.75, 0, -1.35, 0, -1.35, 0.03], ["c", -0, 0, -0, 0.21, -0.03, 0.42], ["c", -0.24, 3.15, -1.53, 5.58, -3.45, 6.36], ["c", -0.27, 0.12, -0.72, 0.24, -0.96, 0.27], ["l", -0.18, -0], ["l", -0, 1.38], ["c", -0, 1.32, -0, 1.41, -0.06, 1.5], ["c", -0.15, 0.24, -0.51, 0.24, -0.66, -0], ["c", -0.06, -0.09, -0.06, -0.18, -0.06, -1.5], ["l", -0, -1.38], ["l", -0.18, -0], ["c", -0.39, -0.06, -0.96, -0.24, -1.38, -0.48], ["c", -1.68, -0.93, -2.82, -3.24, -3.03, -6.15], ["c", -0.03, -0.21, -0.03, -0.42, -0.03, -0.42], ["c", 0, -0.03, -0.6, -0.03, -1.35, -0.03], ["c", -1.5, -0, -1.47, -0, -1.59, -0.18], ["c", -0.09, -0.12, -0.09, -0.3, 0, -0.42], ["c", 0.12, -0.18, 0.09, -0.18, 1.59, -0.18], ["c", 0.75, -0, 1.35, -0, 1.35, -0.03], ["c", 0, -0, 0, -0.21, 0.03, -0.45], ["c", 0.24, -3.12, 1.53, -5.55, 3.45, -6.33], ["c", 0.27, -0.12, 0.72, -0.24, 0.96, -0.27], ["l", 0.18, -0], ["l", 0, -1.38], ["c", 0, -1.53, 0, -1.5, 0.18, -1.62], ["z"], ["m", -0.18, 6.93], ["c", 0, -2.97, 0, -3.15, -0.06, -3.15], ["c", -0.09, 0, -0.51, 0.15, -0.66, 0.21], ["c", -0.87, 0.51, -1.38, 1.62, -1.56, 3.51], ["c", -0.06, 0.54, -0.12, 1.59, -0.12, 2.16], ["l", 0, 0.42], ["l", 1.2, 0], ["l", 1.2, 0], ["l", 0, -3.15], ["z"], ["m", 1.17, -3.06], ["c", -0.09, -0.03, -0.21, -0.06, -0.27, -0.09], ["l", -0.12, 0], ["l", 0, 3.15], ["l", 0, 3.15], ["l", 1.2, 0], ["l", 1.2, 0], ["l", 0, -0.81], ["c", -0.06, -2.4, -0.33, -3.69, -0.93, -4.59], ["c", -0.27, -0.39, -0.66, -0.69, -1.08, -0.81], ["z"], ["m", -1.17, 10.14], ["l", 0, -3.15], ["l", -1.2, -0], ["l", -1.2, -0], ["l", 0, 0.81], ["c", 0.03, 0.96, 0.06, 1.47, 0.15, 2.13], ["c", 0.24, 2.04, 0.96, 3.12, 2.13, 3.36], ["l", 0.12, -0], ["l", 0, -3.15], ["z"], ["m", 3.18, -2.34], ["l", 0, -0.81], ["l", -1.2, 0], ["l", -1.2, 0], ["l", 0, 3.15], ["l", 0, 3.15], ["l", 0.12, 0], ["c", 1.17, -0.24, 1.89, -1.32, 2.13, -3.36], ["c", 0.09, -0.66, 0.12, -1.17, 0.15, -2.13], ["z"]],"w":16.035,"h":21.062},"scripts.comma":{"d":[["M", 1.14, -4.62], ["c", 0.3, -0.12, 0.69, -0.03, 0.93, 0.15], ["c", 0.12, 0.12, 0.36, 0.45, 0.51, 0.78], ["c", 0.9, 1.77, 0.54, 4.05, -1.08, 6.75], ["c", -0.36, 0.63, -0.87, 1.38, -0.96, 1.44], ["c", -0.18, 0.12, -0.42, 0.06, -0.54, -0.12], ["c", -0.09, -0.18, -0.09, -0.3, 0.12, -0.6], ["c", 0.96, -1.44, 1.44, -2.97, 1.38, -4.35], ["c", -0.06, -0.93, -0.3, -1.68, -0.78, -2.46], ["c", -0.27, -0.39, -0.33, -0.63, -0.24, -0.96], ["c", 0.09, -0.27, 0.36, -0.54, 0.66, -0.63], ["z"]],"w":3.042,"h":9.237},"scripts.roll":{"d":[["M", 1.95, -6], ["c", 0.21, -0.09, 0.36, -0.09, 0.57, 0], ["c", 0.39, 0.15, 0.63, 0.39, 1.47, 1.35], ["c", 0.66, 0.75, 0.78, 0.87, 1.08, 1.05], ["c", 0.75, 0.45, 1.65, 0.42, 2.4, -0.06], ["c", 0.12, -0.09, 0.27, -0.27, 0.54, -0.6], ["c", 0.42, -0.54, 0.51, -0.63, 0.69, -0.63], ["c", 0.09, 0, 0.3, 0.12, 0.36, 0.21], ["c", 0.09, 0.12, 0.12, 0.3, 0.03, 0.42], ["c", -0.06, 0.12, -3.15, 3.9, -3.3, 4.08], ["c", -0.06, 0.06, -0.18, 0.12, -0.27, 0.18], ["c", -0.27, 0.12, -0.6, 0.06, -0.99, -0.27], ["c", -0.27, -0.21, -0.42, -0.39, -1.08, -1.14], ["c", -0.63, -0.72, -0.81, -0.9, -1.17, -1.08], ["c", -0.36, -0.18, -0.57, -0.21, -0.99, -0.21], ["c", -0.39, 0, -0.63, 0.03, -0.93, 0.18], ["c", -0.36, 0.15, -0.51, 0.27, -0.9, 0.81], ["c", -0.24, 0.27, -0.45, 0.51, -0.48, 0.54], ["c", -0.12, 0.09, -0.27, 0.06, -0.39, 0], ["c", -0.24, -0.15, -0.33, -0.39, -0.21, -0.6], ["c", 0.09, -0.12, 3.18, -3.87, 3.33, -4.02], ["c", 0.06, -0.06, 0.18, -0.15, 0.24, -0.21], ["z"]],"w":10.817,"h":6.125},"scripts.prall":{"d":[["M", -4.38, -3.69], ["c", 0.06, -0.03, 0.18, -0.06, 0.24, -0.06], ["c", 0.3, 0, 0.27, -0.03, 1.89, 1.95], ["l", 1.53, 1.83], ["c", 0.03, -0, 0.57, -0.84, 1.23, -1.83], ["c", 1.14, -1.68, 1.23, -1.83, 1.35, -1.89], ["c", 0.06, -0.03, 0.18, -0.06, 0.24, -0.06], ["c", 0.3, 0, 0.27, -0.03, 1.89, 1.95], ["l", 1.53, 1.83], ["l", 0.48, -0.69], ["c", 0.51, -0.78, 0.54, -0.84, 0.69, -0.9], ["c", 0.42, -0.18, 0.87, 0.15, 0.81, 0.6], ["c", -0.03, 0.12, -0.3, 0.51, -1.5, 2.37], ["c", -1.38, 2.07, -1.5, 2.22, -1.62, 2.28], ["c", -0.06, 0.03, -0.18, 0.06, -0.24, 0.06], ["c", -0.3, 0, -0.27, 0.03, -1.89, -1.95], ["l", -1.53, -1.83], ["c", -0.03, 0, -0.57, 0.84, -1.23, 1.83], ["c", -1.14, 1.68, -1.23, 1.83, -1.35, 1.89], ["c", -0.06, 0.03, -0.18, 0.06, -0.24, 0.06], ["c", -0.3, 0, -0.27, 0.03, -1.89, -1.95], ["l", -1.53, -1.83], ["l", -0.48, 0.69], ["c", -0.51, 0.78, -0.54, 0.84, -0.69, 0.9], ["c", -0.42, 0.18, -0.87, -0.15, -0.81, -0.6], ["c", 0.03, -0.12, 0.3, -0.51, 1.5, -2.37], ["c", 1.38, -2.07, 1.5, -2.22, 1.62, -2.28], ["z"]],"w":15.011,"h":7.5},"scripts.mordent":{"d":[["M", -0.21, -4.95], ["c", 0.27, -0.15, 0.63, 0, 0.75, 0.27], ["c", 0.06, 0.12, 0.06, 0.24, 0.06, 1.44], ["l", 0, 1.29], ["l", 0.57, -0.84], ["c", 0.51, -0.75, 0.57, -0.84, 0.69, -0.9], ["c", 0.06, -0.03, 0.18, -0.06, 0.24, -0.06], ["c", 0.3, 0, 0.27, -0.03, 1.89, 1.95], ["l", 1.53, 1.83], ["l", 0.48, -0.69], ["c", 0.51, -0.78, 0.54, -0.84, 0.69, -0.9], ["c", 0.42, -0.18, 0.87, 0.15, 0.81, 0.6], ["c", -0.03, 0.12, -0.3, 0.51, -1.5, 2.37], ["c", -1.38, 2.07, -1.5, 2.22, -1.62, 2.28], ["c", -0.06, 0.03, -0.18, 0.06, -0.24, 0.06], ["c", -0.3, 0, -0.27, 0.03, -1.83, -1.89], ["c", -0.81, -0.99, -1.5, -1.8, -1.53, -1.86], ["c", -0.06, -0.03, -0.06, -0.03, -0.12, 0.03], ["c", -0.06, 0.06, -0.06, 0.15, -0.06, 2.28], ["c", -0, 1.95, -0, 2.25, -0.06, 2.34], ["c", -0.18, 0.45, -0.81, 0.48, -1.05, 0.03], ["c", -0.03, -0.06, -0.06, -0.24, -0.06, -1.41], ["l", -0, -1.35], ["l", -0.57, 0.84], ["c", -0.54, 0.78, -0.6, 0.87, -0.72, 0.93], ["c", -0.06, 0.03, -0.18, 0.06, -0.24, 0.06], ["c", -0.3, 0, -0.27, 0.03, -1.89, -1.95], ["l", -1.53, -1.83], ["l", -0.48, 0.69], ["c", -0.51, 0.78, -0.54, 0.84, -0.69, 0.9], ["c", -0.42, 0.18, -0.87, -0.15, -0.81, -0.6], ["c", 0.03, -0.12, 0.3, -0.51, 1.5, -2.37], ["c", 1.38, -2.07, 1.5, -2.22, 1.62, -2.28], ["c", 0.06, -0.03, 0.18, -0.06, 0.24, -0.06], ["c", 0.3, 0, 0.27, -0.03, 1.89, 1.95], ["l", 1.53, 1.83], ["c", 0.03, -0, 0.06, -0.06, 0.09, -0.09], ["c", 0.06, -0.12, 0.06, -0.15, 0.06, -2.28], ["c", -0, -1.92, -0, -2.22, 0.06, -2.31], ["c", 0.06, -0.15, 0.15, -0.24, 0.3, -0.3], ["z"]],"w":15.011,"h":10.012},"flags.u8th":{"d":[["M", -0.42, 3.75], ["l", 0, -3.75], ["l", 0.21, 0], ["l", 0.21, 0], ["l", 0, 0.18], ["c", 0, 0.3, 0.06, 0.84, 0.12, 1.23], ["c", 0.24, 1.53, 0.9, 3.12, 2.13, 5.16], ["l", 0.99, 1.59], ["c", 0.87, 1.44, 1.38, 2.34, 1.77, 3.09], ["c", 0.81, 1.68, 1.2, 3.06, 1.26, 4.53], ["c", 0.03, 1.53, -0.21, 3.27, -0.75, 5.01], ["c", -0.21, 0.69, -0.51, 1.5, -0.6, 1.59], ["c", -0.09, 0.12, -0.27, 0.21, -0.42, 0.21], ["c", -0.15, 0, -0.42, -0.12, -0.51, -0.21], ["c", -0.15, -0.18, -0.18, -0.42, -0.09, -0.66], ["c", 0.15, -0.33, 0.45, -1.2, 0.57, -1.62], ["c", 0.42, -1.38, 0.6, -2.58, 0.6, -3.9], ["c", 0, -0.66, 0, -0.81, -0.06, -1.11], ["c", -0.39, -2.07, -1.8, -4.26, -4.59, -7.14], ["l", -0.42, -0.45], ["l", -0.21, 0], ["l", -0.21, 0], ["l", 0, -3.75], ["z"]],"w":6.692,"h":22.59},"flags.u16th":{"d":[["M", -0.42, 7.5], ["l", 0, -7.5], ["l", 0.21, 0], ["l", 0.21, 0], ["l", 0, 0.39], ["c", 0.06, 1.08, 0.39, 2.19, 0.99, 3.39], ["c", 0.45, 0.9, 0.87, 1.59, 1.95, 3.12], ["c", 1.29, 1.86, 1.77, 2.64, 2.22, 3.57], ["c", 0.45, 0.93, 0.72, 1.8, 0.87, 2.64], ["c", 0.06, 0.51, 0.06, 1.5, 0, 1.92], ["c", -0.12, 0.6, -0.3, 1.2, -0.54, 1.71], ["l", -0.09, 0.24], ["l", 0.18, 0.45], ["c", 0.51, 1.2, 0.72, 2.22, 0.69, 3.42], ["c", -0.06, 1.53, -0.39, 3.03, -0.99, 4.53], ["c", -0.3, 0.75, -0.36, 0.81, -0.57, 0.9], ["c", -0.15, 0.09, -0.33, 0.06, -0.48, -0], ["c", -0.18, -0.09, -0.27, -0.18, -0.33, -0.33], ["c", -0.09, -0.18, -0.06, -0.3, 0.12, -0.75], ["c", 0.66, -1.41, 1.02, -2.88, 1.08, -4.32], ["c", 0, -0.6, -0.03, -1.05, -0.18, -1.59], ["c", -0.3, -1.2, -0.99, -2.4, -2.25, -3.87], ["c", -0.42, -0.48, -1.53, -1.62, -2.19, -2.22], ["l", -0.45, -0.42], ["l", -0.03, 1.11], ["l", 0, 1.11], ["l", -0.21, -0], ["l", -0.21, -0], ["l", 0, -7.5], ["z"], ["m", 1.65, 0.09], ["c", -0.3, -0.3, -0.69, -0.72, -0.9, -0.87], ["l", -0.33, -0.33], ["l", 0, 0.15], ["c", 0, 0.3, 0.06, 0.81, 0.15, 1.26], ["c", 0.27, 1.29, 0.87, 2.61, 2.04, 4.29], ["c", 0.15, 0.24, 0.6, 0.87, 0.96, 1.38], ["l", 1.08, 1.53], ["l", 0.42, 0.63], ["c", 0.03, 0, 0.12, -0.36, 0.21, -0.72], ["c", 0.06, -0.33, 0.06, -1.2, 0, -1.62], ["c", -0.33, -1.71, -1.44, -3.48, -3.63, -5.7], ["z"]],"w":6.693,"h":26.337},"flags.u32nd":{"d":[["M", -0.42, 11.247], ["l", 0, -11.25], ["l", 0.21, 0], ["l", 0.21, 0], ["l", 0, 0.36], ["c", 0.09, 1.68, 0.69, 3.27, 2.07, 5.46], ["l", 0.87, 1.35], ["c", 1.02, 1.62, 1.47, 2.37, 1.86, 3.18], ["c", 0.48, 1.02, 0.78, 1.92, 0.93, 2.88], ["c", 0.06, 0.48, 0.06, 1.5, 0, 1.89], ["c", -0.09, 0.42, -0.21, 0.87, -0.36, 1.26], ["l", -0.12, 0.3], ["l", 0.15, 0.39], ["c", 0.69, 1.56, 0.84, 2.88, 0.54, 4.38], ["c", -0.09, 0.45, -0.27, 1.08, -0.45, 1.47], ["l", -0.12, 0.24], ["l", 0.18, 0.36], ["c", 0.33, 0.72, 0.57, 1.56, 0.69, 2.34], ["c", 0.12, 1.02, -0.06, 2.52, -0.42, 3.84], ["c", -0.27, 0.93, -0.75, 2.13, -0.93, 2.31], ["c", -0.18, 0.15, -0.45, 0.18, -0.66, 0.09], ["c", -0.18, -0.09, -0.27, -0.18, -0.33, -0.33], ["c", -0.09, -0.18, -0.06, -0.3, 0.06, -0.6], ["c", 0.21, -0.36, 0.42, -0.9, 0.57, -1.38], ["c", 0.51, -1.41, 0.69, -3.06, 0.48, -4.08], ["c", -0.15, -0.81, -0.57, -1.68, -1.2, -2.55], ["c", -0.72, -0.99, -1.83, -2.13, -3.3, -3.33], ["l", -0.48, -0.42], ["l", -0.03, 1.53], ["l", 0, 1.56], ["l", -0.21, 0], ["l", -0.21, 0], ["l", 0, -11.25], ["z"], ["m", 1.26, -3.96], ["c", -0.27, -0.3, -0.54, -0.6, -0.66, -0.72], ["l", -0.18, -0.21], ["l", 0, 0.42], ["c", 0.06, 0.87, 0.24, 1.74, 0.66, 2.67], ["c", 0.36, 0.87, 0.96, 1.86, 1.92, 3.18], ["c", 0.21, 0.33, 0.63, 0.87, 0.87, 1.23], ["c", 0.27, 0.39, 0.6, 0.84, 0.75, 1.08], ["l", 0.27, 0.39], ["l", 0.03, -0.12], ["c", 0.12, -0.45, 0.15, -1.05, 0.09, -1.59], ["c", -0.27, -1.86, -1.38, -3.78, -3.75, -6.33], ["z"], ["m", -0.27, 6.09], ["c", -0.27, -0.21, -0.48, -0.42, -0.51, -0.45], ["c", -0.06, -0.03, -0.06, -0.03, -0.06, 0.21], ["c", 0, 0.9, 0.3, 2.04, 0.81, 3.09], ["c", 0.48, 1.02, 0.96, 1.77, 2.37, 3.63], ["c", 0.6, 0.78, 1.05, 1.44, 1.29, 1.77], ["c", 0.06, 0.12, 0.15, 0.21, 0.15, 0.18], ["c", 0.03, -0.03, 0.18, -0.57, 0.24, -0.87], ["c", 0.06, -0.45, 0.06, -1.32, -0.03, -1.74], ["c", -0.09, -0.48, -0.24, -0.9, -0.51, -1.44], ["c", -0.66, -1.35, -1.83, -2.7, -3.75, -4.38], ["z"]],"w":6.697,"h":32.145},"flags.u64th":{"d":[["M", -0.42, 15], ["l", 0, -15], ["l", 0.21, 0], ["l", 0.21, 0], ["l", 0, 0.36], ["c", 0.06, 1.2, 0.39, 2.37, 1.02, 3.66], ["c", 0.39, 0.81, 0.84, 1.56, 1.8, 3.09], ["c", 0.81, 1.26, 1.05, 1.68, 1.35, 2.22], ["c", 0.87, 1.5, 1.35, 2.79, 1.56, 4.08], ["c", 0.06, 0.54, 0.06, 1.56, -0.03, 2.04], ["c", -0.09, 0.48, -0.21, 0.99, -0.36, 1.35], ["l", -0.12, 0.27], ["l", 0.12, 0.27], ["c", 0.09, 0.15, 0.21, 0.45, 0.27, 0.66], ["c", 0.69, 1.89, 0.63, 3.66, -0.18, 5.46], ["l", -0.18, 0.39], ["l", 0.15, 0.33], ["c", 0.3, 0.66, 0.51, 1.44, 0.63, 2.1], ["c", 0.06, 0.48, 0.06, 1.35, 0, 1.71], ["c", -0.15, 0.57, -0.42, 1.2, -0.78, 1.68], ["l", -0.21, 0.27], ["l", 0.18, 0.33], ["c", 0.57, 1.05, 0.93, 2.13, 1.02, 3.18], ["c", 0.06, 0.72, 0, 1.83, -0.21, 2.79], ["c", -0.18, 1.02, -0.63, 2.34, -1.02, 3.09], ["c", -0.15, 0.33, -0.48, 0.45, -0.78, 0.3], ["c", -0.18, -0.09, -0.27, -0.18, -0.33, -0.33], ["c", -0.09, -0.18, -0.06, -0.3, 0.03, -0.54], ["c", 0.75, -1.5, 1.23, -3.45, 1.17, -4.89], ["c", -0.06, -1.02, -0.42, -2.01, -1.17, -3.15], ["c", -0.48, -0.72, -1.02, -1.35, -1.89, -2.22], ["c", -0.57, -0.57, -1.56, -1.5, -1.92, -1.77], ["l", -0.12, -0.09], ["l", 0, 1.68], ["l", 0, 1.68], ["l", -0.21, 0], ["l", -0.21, 0], ["l", 0, -15], ["z"], ["m", 0.93, -8.07], ["c", -0.27, -0.3, -0.48, -0.54, -0.51, -0.54], ["c", -0, 0, -0, 0.69, 0.03, 1.02], ["c", 0.15, 1.47, 0.75, 2.94, 2.04, 4.83], ["l", 1.08, 1.53], ["c", 0.39, 0.57, 0.84, 1.2, 0.99, 1.44], ["c", 0.15, 0.24, 0.3, 0.45, 0.3, 0.45], ["c", -0, 0, 0.03, -0.09, 0.06, -0.21], ["c", 0.36, -1.59, -0.15, -3.33, -1.47, -5.4], ["c", -0.63, -0.93, -1.35, -1.83, -2.52, -3.12], ["z"], ["m", 0.06, 6.72], ["c", -0.24, -0.21, -0.48, -0.42, -0.51, -0.45], ["l", -0.06, -0.06], ["l", 0, 0.33], ["c", 0, 1.2, 0.3, 2.34, 0.93, 3.6], ["c", 0.45, 0.9, 0.96, 1.68, 2.25, 3.51], ["c", 0.39, 0.54, 0.84, 1.17, 1.02, 1.44], ["c", 0.21, 0.33, 0.33, 0.51, 0.33, 0.48], ["c", 0.06, -0.09, 0.21, -0.63, 0.3, -0.99], ["c", 0.06, -0.33, 0.06, -0.45, 0.06, -0.96], ["c", -0, -0.6, -0.03, -0.84, -0.18, -1.35], ["c", -0.3, -1.08, -1.02, -2.28, -2.13, -3.57], ["c", -0.39, -0.45, -1.44, -1.47, -2.01, -1.98], ["z"], ["m", 0, 6.72], ["c", -0.24, -0.21, -0.48, -0.39, -0.51, -0.42], ["l", -0.06, -0.06], ["l", 0, 0.33], ["c", 0, 1.41, 0.45, 2.82, 1.38, 4.35], ["c", 0.42, 0.72, 0.72, 1.14, 1.86, 2.73], ["c", 0.36, 0.45, 0.75, 0.99, 0.87, 1.2], ["c", 0.15, 0.21, 0.3, 0.36, 0.3, 0.36], ["c", 0.06, 0, 0.3, -0.48, 0.39, -0.75], ["c", 0.09, -0.36, 0.12, -0.63, 0.12, -1.05], ["c", -0.06, -1.05, -0.45, -2.04, -1.2, -3.18], ["c", -0.57, -0.87, -1.11, -1.53, -2.07, -2.49], ["c", -0.36, -0.33, -0.84, -0.78, -1.08, -1.02], ["z"]],"w":6.682,"h":39.694},"flags.d8th":{"d":[["M", 5.67, -21.63], ["c", 0.24, -0.12, 0.54, -0.06, 0.69, 0.15], ["c", 0.06, 0.06, 0.21, 0.36, 0.39, 0.66], ["c", 0.84, 1.77, 1.26, 3.36, 1.32, 5.1], ["c", 0.03, 1.29, -0.21, 2.37, -0.81, 3.63], ["c", -0.6, 1.23, -1.26, 2.13, -3.21, 4.38], ["c", -1.35, 1.53, -1.86, 2.19, -2.4, 2.97], ["c", -0.63, 0.93, -1.11, 1.92, -1.38, 2.79], ["c", -0.15, 0.54, -0.27, 1.35, -0.27, 1.8], ["l", 0, 0.15], ["l", -0.21, -0], ["l", -0.21, -0], ["l", 0, -3.75], ["l", 0, -3.75], ["l", 0.21, 0], ["l", 0.21, 0], ["l", 0.48, -0.3], ["c", 1.83, -1.11, 3.12, -2.1, 4.17, -3.12], ["c", 0.78, -0.81, 1.32, -1.53, 1.71, -2.31], ["c", 0.45, -0.93, 0.6, -1.74, 0.51, -2.88], ["c", -0.12, -1.56, -0.63, -3.18, -1.47, -4.68], ["c", -0.12, -0.21, -0.15, -0.33, -0.06, -0.51], ["c", 0.06, -0.15, 0.15, -0.24, 0.33, -0.33], ["z"]],"w":8.492,"h":21.691},"flags.ugrace":{"d":[["M", 6.03, 6.93], ["c", 0.15, -0.09, 0.33, -0.06, 0.51, 0], ["c", 0.15, 0.09, 0.21, 0.15, 0.3, 0.33], ["c", 0.09, 0.18, 0.06, 0.39, -0.03, 0.54], ["c", -0.06, 0.15, -10.89, 8.88, -11.07, 8.97], ["c", -0.15, 0.09, -0.33, 0.06, -0.48, 0], ["c", -0.18, -0.09, -0.24, -0.15, -0.33, -0.33], ["c", -0.09, -0.18, -0.06, -0.39, 0.03, -0.54], ["c", 0.06, -0.15, 10.89, -8.88, 11.07, -8.97], ["z"]],"w":12.019,"h":9.954},"flags.dgrace":{"d":[["M", -6.06, -15.93], ["c", 0.18, -0.09, 0.33, -0.12, 0.48, -0.06], ["c", 0.18, 0.09, 14.01, 8.04, 14.1, 8.1], ["c", 0.12, 0.12, 0.18, 0.33, 0.18, 0.51], ["c", -0.03, 0.21, -0.15, 0.39, -0.36, 0.48], ["c", -0.18, 0.09, -0.33, 0.12, -0.48, 0.06], ["c", -0.18, -0.09, -14.01, -8.04, -14.1, -8.1], ["c", -0.12, -0.12, -0.18, -0.33, -0.18, -0.51], ["c", 0.03, -0.21, 0.15, -0.39, 0.36, -0.48], ["z"]],"w":15.12,"h":9.212},"flags.d16th":{"d":[["M", 6.84, -22.53], ["c", 0.27, -0.12, 0.57, -0.06, 0.72, 0.15], ["c", 0.15, 0.15, 0.33, 0.87, 0.45, 1.56], ["c", 0.06, 0.33, 0.06, 1.35, 0, 1.65], ["c", -0.06, 0.33, -0.15, 0.78, -0.27, 1.11], ["c", -0.12, 0.33, -0.45, 0.96, -0.66, 1.32], ["l", -0.18, 0.27], ["l", 0.09, 0.18], ["c", 0.48, 1.02, 0.72, 2.25, 0.69, 3.3], ["c", -0.06, 1.23, -0.42, 2.28, -1.26, 3.45], ["c", -0.57, 0.87, -0.99, 1.32, -3, 3.39], ["c", -1.56, 1.56, -2.22, 2.4, -2.76, 3.45], ["c", -0.42, 0.84, -0.66, 1.8, -0.66, 2.55], ["l", 0, 0.15], ["l", -0.21, -0], ["l", -0.21, -0], ["l", 0, -7.5], ["l", 0, -7.5], ["l", 0.21, -0], ["l", 0.21, -0], ["l", 0, 1.14], ["l", 0, 1.11], ["l", 0.27, -0.15], ["c", 1.11, -0.57, 1.77, -0.99, 2.52, -1.47], ["c", 2.37, -1.56, 3.69, -3.15, 4.05, -4.83], ["c", 0.03, -0.18, 0.03, -0.39, 0.03, -0.78], ["c", 0, -0.6, -0.03, -0.93, -0.24, -1.5], ["c", -0.06, -0.18, -0.12, -0.39, -0.15, -0.45], ["c", -0.03, -0.24, 0.12, -0.48, 0.36, -0.6], ["z"], ["m", -0.63, 7.5], ["c", -0.06, -0.18, -0.15, -0.36, -0.15, -0.36], ["c", -0.03, 0, -0.03, 0.03, -0.06, 0.06], ["c", -0.06, 0.12, -0.96, 1.02, -1.95, 1.98], ["c", -0.63, 0.57, -1.26, 1.17, -1.44, 1.35], ["c", -1.53, 1.62, -2.28, 2.85, -2.55, 4.32], ["c", -0.03, 0.18, -0.03, 0.54, -0.06, 0.99], ["l", 0, 0.69], ["l", 0.18, -0.09], ["c", 0.93, -0.54, 2.1, -1.29, 2.82, -1.83], ["c", 0.69, -0.51, 1.02, -0.81, 1.53, -1.29], ["c", 1.86, -1.89, 2.37, -3.66, 1.68, -5.82], ["z"]],"w":8.475,"h":22.591},"flags.d32nd":{"d":[["M", 6.794, -29.13], ["c", 0.27, -0.12, 0.57, -0.06, 0.72, 0.15], ["c", 0.12, 0.12, 0.27, 0.63, 0.36, 1.11], ["c", 0.33, 1.59, 0.06, 3.06, -0.81, 4.47], ["l", -0.18, 0.27], ["l", 0.09, 0.15], ["c", 0.12, 0.24, 0.33, 0.69, 0.45, 1.05], ["c", 0.63, 1.83, 0.45, 3.57, -0.57, 5.22], ["l", -0.18, 0.3], ["l", 0.15, 0.27], ["c", 0.42, 0.87, 0.6, 1.71, 0.57, 2.61], ["c", -0.06, 1.29, -0.48, 2.46, -1.35, 3.78], ["c", -0.54, 0.81, -0.93, 1.29, -2.46, 3], ["c", -0.51, 0.54, -1.05, 1.17, -1.26, 1.41], ["c", -1.56, 1.86, -2.25, 3.36, -2.37, 5.01], ["l", 0, 0.33], ["l", -0.21, -0], ["l", -0.21, -0], ["l", 0, -11.25], ["l", 0, -11.25], ["l", 0.21, 0], ["l", 0.21, 0], ["l", 0, 1.35], ["l", 0.03, 1.35], ["l", 0.78, -0.39], ["c", 1.38, -0.69, 2.34, -1.26, 3.24, -1.92], ["c", 1.38, -1.02, 2.28, -2.13, 2.64, -3.21], ["c", 0.15, -0.48, 0.18, -0.72, 0.18, -1.29], ["c", 0, -0.57, -0.06, -0.9, -0.24, -1.47], ["c", -0.06, -0.18, -0.12, -0.39, -0.15, -0.45], ["c", -0.03, -0.24, 0.12, -0.48, 0.36, -0.6], ["z"], ["m", -0.63, 7.2], ["c", -0.09, -0.18, -0.12, -0.21, -0.12, -0.15], ["c", -0.03, 0.09, -1.02, 1.08, -2.04, 2.04], ["c", -1.17, 1.08, -1.65, 1.56, -2.07, 2.04], ["c", -0.84, 0.96, -1.38, 1.86, -1.68, 2.76], ["c", -0.21, 0.57, -0.27, 0.99, -0.3, 1.65], ["l", 0, 0.54], ["l", 0.66, -0.33], ["c", 3.57, -1.86, 5.49, -3.69, 5.94, -5.7], ["c", 0.06, -0.39, 0.06, -1.2, -0.03, -1.65], ["c", -0.06, -0.39, -0.24, -0.9, -0.36, -1.2], ["z"], ["m", -0.06, 7.2], ["c", -0.06, -0.15, -0.12, -0.33, -0.15, -0.45], ["l", -0.06, -0.18], ["l", -0.18, 0.21], ["l", -1.83, 1.83], ["c", -0.87, 0.9, -1.77, 1.8, -1.95, 2.01], ["c", -1.08, 1.29, -1.62, 2.31, -1.89, 3.51], ["c", -0.06, 0.3, -0.06, 0.51, -0.09, 0.93], ["l", 0, 0.57], ["l", 0.09, -0.06], ["c", 0.75, -0.45, 1.89, -1.26, 2.52, -1.74], ["c", 0.81, -0.66, 1.74, -1.53, 2.22, -2.16], ["c", 1.26, -1.53, 1.68, -3.06, 1.32, -4.47], ["z"]],"w":8.475,"h":29.191},"flags.d64th":{"d":[["M", 7.08, -32.88], ["c", 0.3, -0.12, 0.66, -0.03, 0.78, 0.24], ["c", 0.18, 0.33, 0.27, 2.1, 0.15, 2.64], ["c", -0.09, 0.39, -0.21, 0.78, -0.39, 1.08], ["l", -0.15, 0.3], ["l", 0.09, 0.27], ["c", 0.03, 0.12, 0.09, 0.45, 0.12, 0.69], ["c", 0.27, 1.44, 0.18, 2.55, -0.3, 3.6], ["l", -0.12, 0.33], ["l", 0.06, 0.42], ["c", 0.27, 1.35, 0.33, 2.82, 0.21, 3.63], ["c", -0.12, 0.6, -0.3, 1.23, -0.57, 1.8], ["l", -0.15, 0.27], ["l", 0.03, 0.42], ["c", 0.06, 1.02, 0.06, 2.7, 0.03, 3.06], ["c", -0.15, 1.47, -0.66, 2.76, -1.74, 4.41], ["c", -0.45, 0.69, -0.75, 1.11, -1.74, 2.37], ["c", -1.05, 1.38, -1.5, 1.98, -1.95, 2.73], ["c", -0.93, 1.5, -1.38, 2.82, -1.44, 4.2], ["l", 0, 0.42], ["l", -0.21, -0], ["l", -0.21, -0], ["l", 0, -15], ["l", 0, -15], ["l", 0.21, -0], ["l", 0.21, -0], ["l", 0, 1.86], ["l", 0, 1.89], ["c", 0, -0, 0.21, -0.03, 0.45, -0.09], ["c", 2.22, -0.39, 4.08, -1.11, 5.19, -2.01], ["c", 0.63, -0.54, 1.02, -1.14, 1.2, -1.8], ["c", 0.06, -0.3, 0.06, -1.14, -0.03, -1.65], ["c", -0.03, -0.18, -0.06, -0.39, -0.09, -0.48], ["c", -0.03, -0.24, 0.12, -0.48, 0.36, -0.6], ["z"], ["m", -0.45, 6.15], ["c", -0.03, -0.18, -0.06, -0.42, -0.06, -0.54], ["l", -0.03, -0.18], ["l", -0.33, 0.3], ["c", -0.42, 0.36, -0.87, 0.72, -1.68, 1.29], ["c", -1.98, 1.38, -2.25, 1.59, -2.85, 2.16], ["c", -0.75, 0.69, -1.23, 1.44, -1.47, 2.19], ["c", -0.15, 0.45, -0.18, 0.63, -0.21, 1.35], ["l", 0, 0.66], ["l", 0.39, -0.18], ["c", 1.83, -0.9, 3.45, -1.95, 4.47, -2.91], ["c", 0.93, -0.9, 1.53, -1.83, 1.74, -2.82], ["c", 0.06, -0.33, 0.06, -0.87, 0.03, -1.32], ["z"], ["m", -0.27, 4.86], ["c", -0.03, -0.21, -0.06, -0.36, -0.06, -0.36], ["c", 0, -0.03, -0.12, 0.09, -0.24, 0.24], ["c", -0.39, 0.48, -0.99, 1.08, -2.16, 2.19], ["c", -1.47, 1.38, -1.92, 1.83, -2.46, 2.49], ["c", -0.66, 0.87, -1.08, 1.74, -1.29, 2.58], ["c", -0.09, 0.42, -0.15, 0.87, -0.15, 1.44], ["l", 0, 0.54], ["l", 0.48, -0.33], ["c", 1.5, -1.02, 2.58, -1.89, 3.51, -2.82], ["c", 1.47, -1.47, 2.25, -2.85, 2.4, -4.26], ["c", 0.03, -0.39, 0.03, -1.17, -0.03, -1.71], ["z"], ["m", -0.66, 7.68], ["c", 0.03, -0.15, 0.03, -0.6, 0.03, -0.99], ["l", 0, -0.72], ["l", -0.27, 0.33], ["l", -1.74, 1.98], ["c", -1.77, 1.92, -2.43, 2.76, -2.97, 3.9], ["c", -0.51, 1.02, -0.72, 1.77, -0.75, 2.91], ["c", 0, 0.63, 0, 0.63, 0.06, 0.6], ["c", 0.03, -0.03, 0.3, -0.27, 0.63, -0.54], ["c", 0.66, -0.6, 1.86, -1.8, 2.31, -2.31], ["c", 1.65, -1.89, 2.52, -3.54, 2.7, -5.16], ["z"]],"w":8.485,"h":32.932},"clefs.C":{"d":[["M", 0.06, -14.94], ["l", 0.09, -0.06], ["l", 1.92, 0], ["l", 1.92, 0], ["l", 0.09, 0.06], ["l", 0.06, 0.09], ["l", 0, 14.85], ["l", 0, 14.82], ["l", -0.06, 0.09], ["l", -0.09, 0.06], ["l", -1.92, 0], ["l", -1.92, 0], ["l", -0.09, -0.06], ["l", -0.06, -0.09], ["l", 0, -14.82], ["l", 0, -14.85], ["z"], ["m", 5.37, 0], ["c", 0.09, -0.06, 0.09, -0.06, 0.57, -0.06], ["c", 0.45, 0, 0.45, 0, 0.54, 0.06], ["l", 0.06, 0.09], ["l", 0, 7.14], ["l", 0, 7.11], ["l", 0.09, -0.06], ["c", 0.18, -0.18, 0.72, -0.84, 0.96, -1.2], ["c", 0.3, -0.45, 0.66, -1.17, 0.84, -1.65], ["c", 0.36, -0.9, 0.57, -1.83, 0.6, -2.79], ["c", 0.03, -0.48, 0.03, -0.54, 0.09, -0.63], ["c", 0.12, -0.18, 0.36, -0.21, 0.54, -0.12], ["c", 0.18, 0.09, 0.21, 0.15, 0.24, 0.66], ["c", 0.06, 0.87, 0.21, 1.56, 0.57, 2.22], ["c", 0.51, 1.02, 1.26, 1.68, 2.22, 1.92], ["c", 0.21, 0.06, 0.33, 0.06, 0.78, 0.06], ["c", 0.45, -0, 0.57, -0, 0.84, -0.06], ["c", 0.45, -0.12, 0.81, -0.33, 1.08, -0.6], ["c", 0.57, -0.57, 0.87, -1.41, 0.99, -2.88], ["c", 0.06, -0.54, 0.06, -3, 0, -3.57], ["c", -0.21, -2.58, -0.84, -3.87, -2.16, -4.5], ["c", -0.48, -0.21, -1.17, -0.36, -1.77, -0.36], ["c", -0.69, 0, -1.29, 0.27, -1.5, 0.72], ["c", -0.06, 0.15, -0.06, 0.21, -0.06, 0.42], ["c", 0, 0.24, 0, 0.3, 0.06, 0.45], ["c", 0.12, 0.24, 0.24, 0.39, 0.63, 0.66], ["c", 0.42, 0.3, 0.57, 0.48, 0.69, 0.72], ["c", 0.06, 0.15, 0.06, 0.21, 0.06, 0.48], ["c", 0, 0.39, -0.03, 0.63, -0.21, 0.96], ["c", -0.3, 0.6, -0.87, 1.08, -1.5, 1.26], ["c", -0.27, 0.06, -0.87, 0.06, -1.14, 0], ["c", -0.78, -0.24, -1.44, -0.87, -1.65, -1.68], ["c", -0.12, -0.42, -0.09, -1.17, 0.09, -1.71], ["c", 0.51, -1.65, 1.98, -2.82, 3.81, -3.09], ["c", 0.84, -0.09, 2.46, 0.03, 3.51, 0.27], ["c", 2.22, 0.57, 3.69, 1.8, 4.44, 3.75], ["c", 0.36, 0.93, 0.57, 2.13, 0.57, 3.36], ["c", -0, 1.44, -0.48, 2.73, -1.38, 3.81], ["c", -1.26, 1.5, -3.27, 2.43, -5.28, 2.43], ["c", -0.48, -0, -0.51, -0, -0.75, -0.09], ["c", -0.15, -0.03, -0.48, -0.21, -0.78, -0.36], ["c", -0.69, -0.36, -0.87, -0.42, -1.26, -0.42], ["c", -0.27, -0, -0.3, -0, -0.51, 0.09], ["c", -0.57, 0.3, -0.81, 0.9, -0.81, 2.1], ["c", -0, 1.23, 0.24, 1.83, 0.81, 2.13], ["c", 0.21, 0.09, 0.24, 0.09, 0.51, 0.09], ["c", 0.39, -0, 0.57, -0.06, 1.26, -0.42], ["c", 0.3, -0.15, 0.63, -0.33, 0.78, -0.36], ["c", 0.24, -0.09, 0.27, -0.09, 0.75, -0.09], ["c", 2.01, -0, 4.02, 0.93, 5.28, 2.4], ["c", 0.9, 1.11, 1.38, 2.4, 1.38, 3.84], ["c", -0, 1.5, -0.3, 2.88, -0.84, 3.96], ["c", -0.78, 1.59, -2.19, 2.64, -4.17, 3.15], ["c", -1.05, 0.24, -2.67, 0.36, -3.51, 0.27], ["c", -1.83, -0.27, -3.3, -1.44, -3.81, -3.09], ["c", -0.18, -0.54, -0.21, -1.29, -0.09, -1.74], ["c", 0.15, -0.6, 0.63, -1.2, 1.23, -1.47], ["c", 0.36, -0.18, 0.57, -0.21, 0.99, -0.21], ["c", 0.42, 0, 0.63, 0.03, 1.02, 0.21], ["c", 0.42, 0.21, 0.84, 0.63, 1.05, 1.05], ["c", 0.18, 0.36, 0.21, 0.6, 0.21, 0.96], ["c", -0, 0.3, -0, 0.36, -0.06, 0.51], ["c", -0.12, 0.24, -0.27, 0.42, -0.69, 0.72], ["c", -0.57, 0.42, -0.69, 0.63, -0.69, 1.08], ["c", -0, 0.24, -0, 0.3, 0.06, 0.45], ["c", 0.12, 0.21, 0.3, 0.39, 0.57, 0.54], ["c", 0.42, 0.18, 0.87, 0.21, 1.53, 0.15], ["c", 1.08, -0.15, 1.8, -0.57, 2.34, -1.32], ["c", 0.54, -0.75, 0.84, -1.83, 0.99, -3.51], ["c", 0.06, -0.57, 0.06, -3.03, -0, -3.57], ["c", -0.12, -1.47, -0.42, -2.31, -0.99, -2.88], ["c", -0.27, -0.27, -0.63, -0.48, -1.08, -0.6], ["c", -0.27, -0.06, -0.39, -0.06, -0.84, -0.06], ["c", -0.45, 0, -0.57, 0, -0.78, 0.06], ["c", -1.14, 0.27, -2.01, 1.17, -2.46, 2.49], ["c", -0.21, 0.57, -0.3, 0.99, -0.33, 1.65], ["c", -0.03, 0.51, -0.06, 0.57, -0.24, 0.66], ["c", -0.12, 0.06, -0.27, 0.06, -0.39, 0], ["c", -0.21, -0.09, -0.21, -0.15, -0.24, -0.75], ["c", -0.09, -1.92, -0.78, -3.72, -2.01, -5.19], ["c", -0.18, -0.21, -0.36, -0.42, -0.39, -0.45], ["l", -0.09, -0.06], ["l", -0, 7.11], ["l", -0, 7.14], ["l", -0.06, 0.09], ["c", -0.09, 0.06, -0.09, 0.06, -0.54, 0.06], ["c", -0.48, 0, -0.48, 0, -0.57, -0.06], ["l", -0.06, -0.09], ["l", -0, -14.82], ["l", -0, -14.85], ["z"]],"w":20.31,"h":29.97},"clefs.F":{"d":[["M", 6.3, -7.8], ["c", 0.36, -0.03, 1.65, 0, 2.13, 0.03], ["c", 3.6, 0.42, 6.03, 2.1, 6.93, 4.86], ["c", 0.27, 0.84, 0.36, 1.5, 0.36, 2.58], ["c", 0, 0.9, -0.03, 1.35, -0.18, 2.16], ["c", -0.78, 3.78, -3.54, 7.08, -8.37, 9.96], ["c", -1.74, 1.05, -3.87, 2.13, -6.18, 3.12], ["c", -0.39, 0.18, -0.75, 0.33, -0.81, 0.36], ["c", -0.06, 0.03, -0.15, 0.06, -0.18, 0.06], ["c", -0.15, 0, -0.33, -0.18, -0.33, -0.33], ["c", 0, -0.15, 0.06, -0.21, 0.51, -0.48], ["c", 3, -1.77, 5.13, -3.21, 6.84, -4.74], ["c", 0.51, -0.45, 1.59, -1.5, 1.95, -1.95], ["c", 1.89, -2.19, 2.88, -4.32, 3.15, -6.78], ["c", 0.06, -0.42, 0.06, -1.77, 0, -2.19], ["c", -0.24, -2.01, -0.93, -3.63, -2.04, -4.71], ["c", -0.63, -0.63, -1.29, -1.02, -2.07, -1.2], ["c", -1.62, -0.39, -3.36, 0.15, -4.56, 1.44], ["c", -0.54, 0.6, -1.05, 1.47, -1.32, 2.22], ["l", -0.09, 0.21], ["l", 0.24, -0.12], ["c", 0.39, -0.21, 0.63, -0.24, 1.11, -0.24], ["c", 0.3, 0, 0.45, 0, 0.66, 0.06], ["c", 1.92, 0.48, 2.85, 2.55, 1.95, 4.38], ["c", -0.45, 0.99, -1.41, 1.62, -2.46, 1.71], ["c", -1.47, 0.09, -2.91, -0.87, -3.39, -2.25], ["c", -0.18, -0.57, -0.21, -1.32, -0.03, -2.28], ["c", 0.39, -2.25, 1.83, -4.2, 3.81, -5.19], ["c", 0.69, -0.36, 1.59, -0.6, 2.37, -0.69], ["z"], ["m", 11.58, 2.52], ["c", 0.84, -0.21, 1.71, 0.3, 1.89, 1.14], ["c", 0.3, 1.17, -0.72, 2.19, -1.89, 1.89], ["c", -0.99, -0.21, -1.5, -1.32, -1.02, -2.25], ["c", 0.18, -0.39, 0.6, -0.69, 1.02, -0.78], ["z"], ["m", 0, 7.5], ["c", 0.84, -0.21, 1.71, 0.3, 1.89, 1.14], ["c", 0.21, 0.87, -0.3, 1.71, -1.14, 1.89], ["c", -0.87, 0.21, -1.71, -0.3, -1.89, -1.14], ["c", -0.21, -0.84, 0.3, -1.71, 1.14, -1.89], ["z"]],"w":20.153,"h":23.142},"clefs.G":{"d":[["M", 9.69, -37.41], ["c", 0.09, -0.09, 0.24, -0.06, 0.36, 0], ["c", 0.12, 0.09, 0.57, 0.6, 0.96, 1.11], ["c", 1.77, 2.34, 3.21, 5.85, 3.57, 8.73], ["c", 0.21, 1.56, 0.03, 3.27, -0.45, 4.86], ["c", -0.69, 2.31, -1.92, 4.47, -4.23, 7.44], ["c", -0.3, 0.39, -0.57, 0.72, -0.6, 0.75], ["c", -0.03, 0.06, 0, 0.15, 0.18, 0.78], ["c", 0.54, 1.68, 1.38, 4.44, 1.68, 5.49], ["l", 0.09, 0.42], ["l", 0.39, -0], ["c", 1.47, 0.09, 2.76, 0.51, 3.96, 1.29], ["c", 1.83, 1.23, 3.06, 3.21, 3.39, 5.52], ["c", 0.09, 0.45, 0.12, 1.29, 0.06, 1.74], ["c", -0.09, 1.02, -0.33, 1.83, -0.75, 2.73], ["c", -0.84, 1.71, -2.28, 3.06, -4.02, 3.72], ["l", -0.33, 0.12], ["l", 0.03, 1.26], ["c", 0, 1.74, -0.06, 3.63, -0.21, 4.62], ["c", -0.45, 3.06, -2.19, 5.49, -4.47, 6.21], ["c", -0.57, 0.18, -0.9, 0.21, -1.59, 0.21], ["c", -0.69, -0, -1.02, -0.03, -1.65, -0.21], ["c", -1.14, -0.27, -2.13, -0.84, -2.94, -1.65], ["c", -0.99, -0.99, -1.56, -2.16, -1.71, -3.54], ["c", -0.09, -0.81, 0.06, -1.53, 0.45, -2.13], ["c", 0.63, -0.99, 1.83, -1.56, 3, -1.53], ["c", 1.5, 0.09, 2.64, 1.32, 2.73, 2.94], ["c", 0.06, 1.47, -0.93, 2.7, -2.37, 2.97], ["c", -0.45, 0.06, -0.84, 0.03, -1.29, -0.09], ["l", -0.21, -0.09], ["l", 0.09, 0.12], ["c", 0.39, 0.54, 0.78, 0.93, 1.32, 1.26], ["c", 1.35, 0.87, 3.06, 1.02, 4.35, 0.36], ["c", 1.44, -0.72, 2.52, -2.28, 2.97, -4.35], ["c", 0.15, -0.66, 0.24, -1.5, 0.3, -3.03], ["c", 0.03, -0.84, 0.03, -2.94, -0, -3], ["c", -0.03, -0, -0.18, -0, -0.36, 0.03], ["c", -0.66, 0.12, -0.99, 0.12, -1.83, 0.12], ["c", -1.05, -0, -1.71, -0.06, -2.61, -0.3], ["c", -4.02, -0.99, -7.11, -4.35, -7.8, -8.46], ["c", -0.12, -0.66, -0.12, -0.99, -0.12, -1.83], ["c", -0, -0.84, -0, -1.14, 0.15, -1.92], ["c", 0.36, -2.28, 1.41, -4.62, 3.3, -7.29], ["l", 2.79, -3.6], ["c", 0.54, -0.66, 0.96, -1.2, 0.96, -1.23], ["c", -0, -0.03, -0.09, -0.33, -0.18, -0.69], ["c", -0.96, -3.21, -1.41, -5.28, -1.59, -7.68], ["c", -0.12, -1.38, -0.15, -3.09, -0.06, -3.96], ["c", 0.33, -2.67, 1.38, -5.07, 3.12, -7.08], ["c", 0.36, -0.42, 0.99, -1.05, 1.17, -1.14], ["z"], ["m", 2.01, 4.71], ["c", -0.15, -0.3, -0.3, -0.54, -0.3, -0.54], ["c", -0.03, 0, -0.18, 0.09, -0.3, 0.21], ["c", -2.4, 1.74, -3.87, 4.2, -4.26, 7.11], ["c", -0.06, 0.54, -0.06, 1.41, -0.03, 1.89], ["c", 0.09, 1.29, 0.48, 3.12, 1.08, 5.22], ["c", 0.15, 0.42, 0.24, 0.78, 0.24, 0.81], ["c", 0, 0.03, 0.84, -1.11, 1.23, -1.68], ["c", 1.89, -2.73, 2.88, -5.07, 3.15, -7.53], ["c", 0.09, -0.57, 0.12, -1.74, 0.06, -2.37], ["c", -0.09, -1.23, -0.27, -1.92, -0.87, -3.12], ["z"], ["m", -2.94, 20.7], ["c", -0.21, -0.72, -0.39, -1.32, -0.42, -1.32], ["c", 0, 0, -1.2, 1.47, -1.86, 2.37], ["c", -2.79, 3.63, -4.02, 6.3, -4.35, 9.3], ["c", -0.03, 0.21, -0.03, 0.69, -0.03, 1.08], ["c", 0, 0.69, 0, 0.75, 0.06, 1.11], ["c", 0.12, 0.54, 0.27, 0.99, 0.51, 1.47], ["c", 0.69, 1.38, 1.83, 2.55, 3.42, 3.42], ["c", 0.96, 0.54, 2.07, 0.9, 3.21, 1.08], ["c", 0.78, 0.12, 2.04, 0.12, 2.94, -0.03], ["c", 0.51, -0.06, 0.45, -0.03, 0.42, -0.3], ["c", -0.24, -3.33, -0.72, -6.33, -1.62, -10.08], ["c", -0.09, -0.39, -0.18, -0.75, -0.18, -0.78], ["c", -0.03, -0.03, -0.42, -0, -0.81, 0.09], ["c", -0.9, 0.18, -1.65, 0.57, -2.22, 1.14], ["c", -0.72, 0.72, -1.08, 1.65, -1.05, 2.64], ["c", 0.06, 0.96, 0.48, 1.83, 1.23, 2.58], ["c", 0.36, 0.36, 0.72, 0.63, 1.17, 0.9], ["c", 0.33, 0.18, 0.36, 0.21, 0.42, 0.33], ["c", 0.18, 0.42, -0.18, 0.9, -0.6, 0.87], ["c", -0.18, -0.03, -0.84, -0.36, -1.26, -0.63], ["c", -0.78, -0.51, -1.38, -1.11, -1.86, -1.83], ["c", -1.77, -2.7, -0.99, -6.42, 1.71, -8.19], ["c", 0.3, -0.21, 0.81, -0.48, 1.17, -0.63], ["c", 0.3, -0.09, 1.02, -0.3, 1.14, -0.3], ["c", 0.06, -0, 0.09, -0, 0.09, -0.03], ["c", 0.03, -0.03, -0.51, -1.92, -1.23, -4.26], ["z"], ["m", 3.78, 7.41], ["c", -0.18, -0.03, -0.36, -0.06, -0.39, -0.06], ["c", -0.03, 0, 0, 0.21, 0.18, 1.02], ["c", 0.75, 3.18, 1.26, 6.3, 1.5, 9.09], ["c", 0.06, 0.72, 0, 0.69, 0.51, 0.42], ["c", 0.78, -0.36, 1.44, -0.96, 1.98, -1.77], ["c", 1.08, -1.62, 1.2, -3.69, 0.3, -5.55], ["c", -0.81, -1.62, -2.31, -2.79, -4.08, -3.15], ["z"]],"w":19.051,"h":57.057},"clefs.perc":{"d":[["M", 5.07, -7.44], ["l", 0.09, -0.06], ["l", 1.53, 0], ["l", 1.53, 0], ["l", 0.09, 0.06], ["l", 0.06, 0.09], ["l", 0, 7.35], ["l", 0, 7.32], ["l", -0.06, 0.09], ["l", -0.09, 0.06], ["l", -1.53, -0], ["l", -1.53, -0], ["l", -0.09, -0.06], ["l", -0.06, -0.09], ["l", 0, -7.32], ["l", 0, -7.35], ["z"], ["m", 6.63, 0], ["l", 0.09, -0.06], ["l", 1.53, 0], ["l", 1.53, 0], ["l", 0.09, 0.06], ["l", 0.06, 0.09], ["l", 0, 7.35], ["l", 0, 7.32], ["l", -0.06, 0.09], ["l", -0.09, 0.06], ["l", -1.53, -0], ["l", -1.53, -0], ["l", -0.09, -0.06], ["l", -0.06, -0.09], ["l", 0, -7.32], ["l", 0, -7.35], ["z"]],"w":9.99,"h":14.97},"timesig.common":{"d":[["M", 6.66, -7.826], ["c", 0.72, -0.06, 1.41, -0.03, 1.98, 0.09], ["c", 1.2, 0.27, 2.34, 0.96, 3.09, 1.92], ["c", 0.63, 0.81, 1.08, 1.86, 1.14, 2.73], ["c", 0.06, 1.02, -0.51, 1.92, -1.44, 2.22], ["c", -0.24, 0.09, -0.3, 0.09, -0.63, 0.09], ["c", -0.33, -0, -0.42, -0, -0.63, -0.06], ["c", -0.66, -0.24, -1.14, -0.63, -1.41, -1.2], ["c", -0.15, -0.3, -0.21, -0.51, -0.24, -0.9], ["c", -0.06, -1.08, 0.57, -2.04, 1.56, -2.37], ["c", 0.18, -0.06, 0.27, -0.06, 0.63, -0.06], ["l", 0.45, 0], ["c", 0.06, 0.03, 0.09, 0.03, 0.09, 0], ["c", 0, 0, -0.09, -0.12, -0.24, -0.27], ["c", -1.02, -1.11, -2.55, -1.68, -4.08, -1.5], ["c", -1.29, 0.15, -2.04, 0.69, -2.4, 1.74], ["c", -0.36, 0.93, -0.42, 1.89, -0.42, 5.37], ["c", 0, 2.97, 0.06, 3.96, 0.24, 4.77], ["c", 0.24, 1.08, 0.63, 1.68, 1.41, 2.07], ["c", 0.81, 0.39, 2.16, 0.45, 3.18, 0.09], ["c", 1.29, -0.45, 2.37, -1.53, 3.03, -2.97], ["c", 0.15, -0.33, 0.33, -0.87, 0.39, -1.17], ["c", 0.09, -0.24, 0.15, -0.36, 0.3, -0.39], ["c", 0.21, -0.03, 0.42, 0.15, 0.39, 0.36], ["c", -0.06, 0.39, -0.42, 1.38, -0.69, 1.89], ["c", -0.96, 1.8, -2.49, 2.94, -4.23, 3.18], ["c", -0.99, 0.12, -2.58, -0.06, -3.63, -0.45], ["c", -0.96, -0.36, -1.71, -0.84, -2.4, -1.5], ["c", -1.11, -1.11, -1.8, -2.61, -2.04, -4.56], ["c", -0.06, -0.6, -0.06, -2.01, 0, -2.61], ["c", 0.24, -1.95, 0.9, -3.45, 2.01, -4.56], ["c", 0.69, -0.66, 1.44, -1.11, 2.37, -1.47], ["c", 0.63, -0.24, 1.47, -0.42, 2.22, -0.48], ["z"]],"w":13.038,"h":15.697},"timesig.cut":{"d":[["M", 6.24, -10.44], ["c", 0.09, -0.06, 0.09, -0.06, 0.48, -0.06], ["c", 0.36, 0, 0.36, 0, 0.45, 0.06], ["l", 0.06, 0.09], ["l", 0, 1.23], ["l", 0, 1.26], ["l", 0.27, 0], ["c", 1.26, 0, 2.49, 0.45, 3.48, 1.29], ["c", 1.05, 0.87, 1.8, 2.28, 1.89, 3.48], ["c", 0.06, 1.02, -0.51, 1.92, -1.44, 2.22], ["c", -0.24, 0.09, -0.3, 0.09, -0.63, 0.09], ["c", -0.33, -0, -0.42, -0, -0.63, -0.06], ["c", -0.66, -0.24, -1.14, -0.63, -1.41, -1.2], ["c", -0.15, -0.3, -0.21, -0.51, -0.24, -0.9], ["c", -0.06, -1.08, 0.57, -2.04, 1.56, -2.37], ["c", 0.18, -0.06, 0.27, -0.06, 0.63, -0.06], ["l", 0.45, -0], ["c", 0.06, 0.03, 0.09, 0.03, 0.09, -0], ["c", 0, -0.03, -0.45, -0.51, -0.66, -0.69], ["c", -0.87, -0.69, -1.83, -1.05, -2.94, -1.11], ["l", -0.42, 0], ["l", 0, 7.17], ["l", 0, 7.14], ["l", 0.42, 0], ["c", 0.69, -0.03, 1.23, -0.18, 1.86, -0.51], ["c", 1.05, -0.51, 1.89, -1.47, 2.46, -2.7], ["c", 0.15, -0.33, 0.33, -0.87, 0.39, -1.17], ["c", 0.09, -0.24, 0.15, -0.36, 0.3, -0.39], ["c", 0.21, -0.03, 0.42, 0.15, 0.39, 0.36], ["c", -0.03, 0.24, -0.21, 0.78, -0.39, 1.2], ["c", -0.96, 2.37, -2.94, 3.9, -5.13, 3.9], ["l", -0.3, 0], ["l", 0, 1.26], ["l", 0, 1.23], ["l", -0.06, 0.09], ["c", -0.09, 0.06, -0.09, 0.06, -0.45, 0.06], ["c", -0.39, 0, -0.39, 0, -0.48, -0.06], ["l", -0.06, -0.09], ["l", 0, -1.29], ["l", 0, -1.29], ["l", -0.21, -0.03], ["c", -1.23, -0.21, -2.31, -0.63, -3.21, -1.29], ["c", -0.15, -0.09, -0.45, -0.36, -0.66, -0.57], ["c", -1.11, -1.11, -1.8, -2.61, -2.04, -4.56], ["c", -0.06, -0.6, -0.06, -2.01, 0, -2.61], ["c", 0.24, -1.95, 0.93, -3.45, 2.04, -4.59], ["c", 0.42, -0.39, 0.78, -0.66, 1.26, -0.93], ["c", 0.75, -0.45, 1.65, -0.75, 2.61, -0.9], ["l", 0.21, -0.03], ["l", 0, -1.29], ["l", 0, -1.29], ["z"], ["m", -0.06, 10.44], ["c", 0, -5.58, 0, -6.99, -0.03, -6.99], ["c", -0.15, 0, -0.63, 0.27, -0.87, 0.45], ["c", -0.45, 0.36, -0.75, 0.93, -0.93, 1.77], ["c", -0.18, 0.81, -0.24, 1.8, -0.24, 4.74], ["c", 0, 2.97, 0.06, 3.96, 0.24, 4.77], ["c", 0.24, 1.08, 0.66, 1.68, 1.41, 2.07], ["c", 0.12, 0.06, 0.3, 0.12, 0.33, 0.15], ["l", 0.09, 0], ["l", 0, -6.96], ["z"]],"w":13.038,"h":20.97},"0":{"d":[["M", 4.83, -14.97], ["c", 0.33, -0.03, 1.11, 0, 1.47, 0.06], ["c", 1.68, 0.36, 2.97, 1.59, 3.78, 3.6], ["c", 1.2, 2.97, 0.81, 6.96, -0.9, 9.27], ["c", -0.78, 1.08, -1.71, 1.71, -2.91, 1.95], ["c", -0.45, 0.09, -1.32, 0.09, -1.77, 0], ["c", -0.81, -0.18, -1.47, -0.51, -2.07, -1.02], ["c", -2.34, -2.07, -3.15, -6.72, -1.74, -10.2], ["c", 0.87, -2.16, 2.28, -3.42, 4.14, -3.66], ["z"], ["m", 1.11, 0.87], ["c", -0.21, -0.06, -0.69, -0.09, -0.87, -0.06], ["c", -0.54, 0.12, -0.87, 0.42, -1.17, 0.99], ["c", -0.36, 0.66, -0.51, 1.56, -0.6, 3], ["c", -0.03, 0.75, -0.03, 4.59, -0, 5.31], ["c", 0.09, 1.5, 0.27, 2.4, 0.6, 3.06], ["c", 0.24, 0.48, 0.57, 0.78, 0.96, 0.9], ["c", 0.27, 0.09, 0.78, 0.09, 1.05, -0], ["c", 0.39, -0.12, 0.72, -0.42, 0.96, -0.9], ["c", 0.33, -0.66, 0.51, -1.56, 0.6, -3.06], ["c", 0.03, -0.72, 0.03, -4.56, -0, -5.31], ["c", -0.09, -1.47, -0.27, -2.37, -0.6, -3.03], ["c", -0.24, -0.48, -0.54, -0.78, -0.93, -0.9], ["z"]],"w":10.78,"h":14.959},"1":{"d":[["M", 3.3, -15.06], ["c", 0.06, -0.06, 0.21, -0.03, 0.66, 0.15], ["c", 0.81, 0.39, 1.08, 0.39, 1.83, 0.03], ["c", 0.21, -0.09, 0.39, -0.15, 0.42, -0.15], ["c", 0.12, 0, 0.21, 0.09, 0.27, 0.21], ["c", 0.06, 0.12, 0.06, 0.33, 0.06, 5.94], ["c", 0, 3.93, 0, 5.85, 0.03, 6.03], ["c", 0.06, 0.36, 0.15, 0.69, 0.27, 0.96], ["c", 0.36, 0.75, 0.93, 1.17, 1.68, 1.26], ["c", 0.3, 0.03, 0.39, 0.09, 0.39, 0.3], ["c", 0, 0.15, -0.03, 0.18, -0.09, 0.24], ["c", -0.06, 0.06, -0.09, 0.06, -0.48, 0.06], ["c", -0.42, -0, -0.69, -0.03, -2.1, -0.24], ["c", -0.9, -0.15, -1.77, -0.15, -2.67, -0], ["c", -1.41, 0.21, -1.68, 0.24, -2.1, 0.24], ["c", -0.39, -0, -0.42, -0, -0.48, -0.06], ["c", -0.06, -0.06, -0.06, -0.09, -0.06, -0.24], ["c", 0, -0.21, 0.06, -0.27, 0.36, -0.3], ["c", 0.75, -0.09, 1.32, -0.51, 1.68, -1.26], ["c", 0.12, -0.27, 0.21, -0.6, 0.27, -0.96], ["c", 0.03, -0.18, 0.03, -1.59, 0.03, -4.29], ["c", 0, -3.87, 0, -4.05, -0.06, -4.14], ["c", -0.09, -0.15, -0.18, -0.24, -0.39, -0.24], ["c", -0.12, -0, -0.15, 0.03, -0.21, 0.06], ["c", -0.03, 0.06, -0.45, 0.99, -0.96, 2.13], ["c", -0.48, 1.14, -0.9, 2.1, -0.93, 2.16], ["c", -0.06, 0.15, -0.21, 0.24, -0.33, 0.24], ["c", -0.24, 0, -0.42, -0.18, -0.42, -0.39], ["c", 0, -0.06, 3.27, -7.62, 3.33, -7.74], ["z"]],"w":8.94,"h":15.058},"2":{"d":[["M", 4.23, -14.97], ["c", 0.57, -0.06, 1.68, 0, 2.34, 0.18], ["c", 0.69, 0.18, 1.5, 0.54, 2.01, 0.9], ["c", 1.35, 0.96, 1.95, 2.25, 1.77, 3.81], ["c", -0.15, 1.35, -0.66, 2.34, -1.68, 3.15], ["c", -0.6, 0.48, -1.44, 0.93, -3.12, 1.65], ["c", -1.32, 0.57, -1.8, 0.81, -2.37, 1.14], ["c", -0.57, 0.33, -0.57, 0.33, -0.24, 0.27], ["c", 0.39, -0.09, 1.26, -0.09, 1.68, 0], ["c", 0.72, 0.15, 1.41, 0.45, 2.1, 0.9], ["c", 0.99, 0.63, 1.86, 0.87, 2.55, 0.75], ["c", 0.24, -0.06, 0.42, -0.15, 0.57, -0.3], ["c", 0.12, -0.09, 0.3, -0.42, 0.3, -0.51], ["c", 0, -0.09, 0.12, -0.21, 0.24, -0.24], ["c", 0.18, -0.03, 0.39, 0.12, 0.39, 0.3], ["c", 0, 0.12, -0.15, 0.57, -0.3, 0.87], ["c", -0.54, 1.02, -1.56, 1.74, -2.79, 2.01], ["c", -0.42, 0.09, -1.23, 0.09, -1.62, 0.03], ["c", -0.81, -0.18, -1.32, -0.45, -2.01, -1.11], ["c", -0.45, -0.45, -0.63, -0.57, -0.96, -0.69], ["c", -0.84, -0.27, -1.89, 0.12, -2.25, 0.9], ["c", -0.12, 0.21, -0.21, 0.54, -0.21, 0.72], ["c", 0, 0.12, -0.12, 0.21, -0.27, 0.24], ["c", -0.15, 0, -0.27, -0.03, -0.33, -0.15], ["c", -0.09, -0.21, 0.09, -1.08, 0.33, -1.71], ["c", 0.24, -0.66, 0.66, -1.26, 1.29, -1.89], ["c", 0.45, -0.45, 0.9, -0.81, 1.92, -1.56], ["c", 1.29, -0.93, 1.89, -1.44, 2.34, -1.98], ["c", 0.87, -1.05, 1.26, -2.19, 1.2, -3.63], ["c", -0.06, -1.29, -0.39, -2.31, -0.96, -2.91], ["c", -0.36, -0.33, -0.72, -0.51, -1.17, -0.54], ["c", -0.84, -0.03, -1.53, 0.42, -1.59, 1.05], ["c", -0.03, 0.33, 0.12, 0.6, 0.57, 1.14], ["c", 0.45, 0.54, 0.54, 0.87, 0.42, 1.41], ["c", -0.15, 0.63, -0.54, 1.11, -1.08, 1.38], ["c", -0.63, 0.33, -1.2, 0.33, -1.83, 0], ["c", -0.24, -0.12, -0.33, -0.18, -0.54, -0.39], ["c", -0.18, -0.18, -0.27, -0.3, -0.36, -0.51], ["c", -0.24, -0.45, -0.27, -0.84, -0.21, -1.38], ["c", 0.12, -0.75, 0.45, -1.41, 1.02, -1.98], ["c", 0.72, -0.72, 1.74, -1.17, 2.85, -1.32], ["z"]],"w":10.764,"h":14.993},"3":{"d":[["M", 3.78, -14.97], ["c", 0.3, -0.03, 1.41, 0, 1.83, 0.06], ["c", 2.22, 0.3, 3.51, 1.32, 3.72, 2.91], ["c", 0.03, 0.33, 0.03, 1.26, -0.03, 1.65], ["c", -0.12, 0.84, -0.48, 1.47, -1.05, 1.77], ["c", -0.27, 0.15, -0.36, 0.24, -0.45, 0.39], ["c", -0.09, 0.21, -0.09, 0.36, 0, 0.57], ["c", 0.09, 0.15, 0.18, 0.24, 0.51, 0.39], ["c", 0.75, 0.42, 1.23, 1.14, 1.41, 2.13], ["c", 0.06, 0.42, 0.06, 1.35, 0, 1.71], ["c", -0.18, 0.81, -0.48, 1.38, -1.02, 1.95], ["c", -0.75, 0.72, -1.8, 1.2, -3.18, 1.38], ["c", -0.42, 0.06, -1.56, 0.06, -1.95, 0], ["c", -1.89, -0.33, -3.18, -1.29, -3.51, -2.64], ["c", -0.03, -0.12, -0.03, -0.33, -0.03, -0.6], ["c", 0, -0.36, 0, -0.42, 0.06, -0.63], ["c", 0.12, -0.3, 0.27, -0.51, 0.51, -0.75], ["c", 0.24, -0.24, 0.45, -0.39, 0.75, -0.51], ["c", 0.21, -0.06, 0.27, -0.06, 0.6, -0.06], ["c", 0.33, 0, 0.39, 0, 0.6, 0.06], ["c", 0.3, 0.12, 0.51, 0.27, 0.75, 0.51], ["c", 0.36, 0.33, 0.57, 0.75, 0.6, 1.2], ["c", 0, 0.21, 0, 0.27, -0.06, 0.42], ["c", -0.09, 0.18, -0.12, 0.24, -0.54, 0.54], ["c", -0.51, 0.36, -0.63, 0.54, -0.6, 0.87], ["c", 0.06, 0.54, 0.54, 0.9, 1.38, 0.99], ["c", 0.36, 0.06, 0.72, 0.03, 0.96, -0.06], ["c", 0.81, -0.27, 1.29, -1.23, 1.44, -2.79], ["c", 0.03, -0.45, 0.03, -1.95, -0.03, -2.37], ["c", -0.09, -0.75, -0.33, -1.23, -0.75, -1.44], ["c", -0.33, -0.18, -0.45, -0.18, -1.98, -0.18], ["c", -1.35, 0, -1.41, 0, -1.5, -0.06], ["c", -0.18, -0.12, -0.24, -0.39, -0.12, -0.6], ["c", 0.12, -0.15, 0.15, -0.15, 1.68, -0.15], ["c", 1.5, 0, 1.62, 0, 1.89, -0.15], ["c", 0.18, -0.09, 0.42, -0.36, 0.54, -0.57], ["c", 0.18, -0.42, 0.27, -0.9, 0.3, -1.95], ["c", 0.03, -1.2, -0.06, -1.8, -0.36, -2.37], ["c", -0.24, -0.48, -0.63, -0.81, -1.14, -0.96], ["c", -0.3, -0.06, -1.08, -0.06, -1.38, 0.03], ["c", -0.6, 0.15, -0.9, 0.42, -0.96, 0.84], ["c", -0.03, 0.3, 0.06, 0.45, 0.63, 0.84], ["c", 0.33, 0.24, 0.42, 0.39, 0.45, 0.63], ["c", 0.03, 0.72, -0.57, 1.5, -1.32, 1.65], ["c", -1.05, 0.27, -2.1, -0.57, -2.1, -1.65], ["c", 0, -0.45, 0.15, -0.96, 0.39, -1.38], ["c", 0.12, -0.21, 0.54, -0.63, 0.81, -0.81], ["c", 0.57, -0.42, 1.38, -0.69, 2.25, -0.81], ["z"]],"w":9.735,"h":14.967},"4":{"d":[["M", 8.64, -14.94], ["c", 0.27, -0.09, 0.42, -0.12, 0.54, -0.03], ["c", 0.09, 0.06, 0.15, 0.21, 0.15, 0.3], ["c", -0.03, 0.06, -1.92, 2.31, -4.23, 5.04], ["c", -2.31, 2.73, -4.23, 4.98, -4.26, 5.01], ["c", -0.03, 0.06, 0.12, 0.06, 2.55, 0.06], ["l", 2.61, 0], ["l", 0, -2.37], ["c", 0, -2.19, 0.03, -2.37, 0.06, -2.46], ["c", 0.03, -0.06, 0.21, -0.18, 0.57, -0.42], ["c", 1.08, -0.72, 1.38, -1.08, 1.86, -2.16], ["c", 0.12, -0.3, 0.24, -0.54, 0.27, -0.57], ["c", 0.12, -0.12, 0.39, -0.06, 0.45, 0.12], ["c", 0.06, 0.09, 0.06, 0.57, 0.06, 3.96], ["l", 0, 3.9], ["l", 1.08, 0], ["c", 1.05, 0, 1.11, 0, 1.2, 0.06], ["c", 0.24, 0.15, 0.24, 0.54, 0, 0.69], ["c", -0.09, 0.06, -0.15, 0.06, -1.2, 0.06], ["l", -1.08, 0], ["l", 0, 0.33], ["c", 0, 0.57, 0.09, 1.11, 0.3, 1.53], ["c", 0.36, 0.75, 0.93, 1.17, 1.68, 1.26], ["c", 0.3, 0.03, 0.39, 0.09, 0.39, 0.3], ["c", 0, 0.15, -0.03, 0.18, -0.09, 0.24], ["c", -0.06, 0.06, -0.09, 0.06, -0.48, 0.06], ["c", -0.42, 0, -0.69, -0.03, -2.1, -0.24], ["c", -0.9, -0.15, -1.77, -0.15, -2.67, 0], ["c", -1.41, 0.21, -1.68, 0.24, -2.1, 0.24], ["c", -0.39, 0, -0.42, 0, -0.48, -0.06], ["c", -0.06, -0.06, -0.06, -0.09, -0.06, -0.24], ["c", 0, -0.21, 0.06, -0.27, 0.36, -0.3], ["c", 0.75, -0.09, 1.32, -0.51, 1.68, -1.26], ["c", 0.21, -0.42, 0.3, -0.96, 0.3, -1.53], ["l", 0, -0.33], ["l", -2.7, 0], ["c", -2.91, 0, -2.85, 0, -3.09, -0.15], ["c", -0.18, -0.12, -0.3, -0.39, -0.27, -0.54], ["c", 0.03, -0.06, 0.18, -0.24, 0.33, -0.45], ["c", 0.75, -0.9, 1.59, -2.07, 2.13, -3.03], ["c", 0.33, -0.54, 0.84, -1.62, 1.05, -2.16], ["c", 0.57, -1.41, 0.84, -2.64, 0.9, -4.05], ["c", 0.03, -0.63, 0.06, -0.72, 0.24, -0.81], ["l", 0.12, -0.06], ["l", 0.45, 0.12], ["c", 0.66, 0.18, 1.02, 0.24, 1.47, 0.27], ["c", 0.6, 0.03, 1.23, -0.09, 2.01, -0.33], ["z"]],"w":11.795,"h":14.994},"5":{"d":[["M", 1.02, -14.94], ["c", 0.12, -0.09, 0.03, -0.09, 1.08, 0.06], ["c", 2.49, 0.36, 4.35, 0.36, 6.96, -0.06], ["c", 0.57, -0.09, 0.66, -0.06, 0.81, 0.06], ["c", 0.15, 0.18, 0.12, 0.24, -0.15, 0.51], ["c", -1.29, 1.26, -3.24, 2.04, -5.58, 2.31], ["c", -0.6, 0.09, -1.2, 0.12, -1.71, 0.12], ["c", -0.39, 0, -0.45, 0, -0.57, 0.06], ["c", -0.09, 0.06, -0.15, 0.12, -0.21, 0.21], ["l", -0.06, 0.12], ["l", 0, 1.65], ["l", 0, 1.65], ["l", 0.21, -0.21], ["c", 0.66, -0.57, 1.41, -0.96, 2.19, -1.14], ["c", 0.33, -0.06, 1.41, -0.06, 1.95, 0], ["c", 2.61, 0.36, 4.02, 1.74, 4.26, 4.14], ["c", 0.03, 0.45, 0.03, 1.08, -0.03, 1.44], ["c", -0.18, 1.02, -0.78, 2.01, -1.59, 2.7], ["c", -0.72, 0.57, -1.62, 1.02, -2.49, 1.2], ["c", -1.38, 0.27, -3.03, 0.06, -4.2, -0.54], ["c", -1.08, -0.54, -1.71, -1.32, -1.86, -2.28], ["c", -0.09, -0.69, 0.09, -1.29, 0.57, -1.74], ["c", 0.24, -0.24, 0.45, -0.39, 0.75, -0.51], ["c", 0.21, -0.06, 0.27, -0.06, 0.6, -0.06], ["c", 0.33, 0, 0.39, 0, 0.6, 0.06], ["c", 0.3, 0.12, 0.51, 0.27, 0.75, 0.51], ["c", 0.36, 0.33, 0.57, 0.75, 0.6, 1.2], ["c", 0, 0.21, 0, 0.27, -0.06, 0.42], ["c", -0.09, 0.18, -0.12, 0.24, -0.54, 0.54], ["c", -0.18, 0.12, -0.36, 0.3, -0.42, 0.33], ["c", -0.36, 0.42, -0.18, 0.99, 0.36, 1.26], ["c", 0.51, 0.27, 1.47, 0.36, 2.01, 0.27], ["c", 0.93, -0.21, 1.47, -1.17, 1.65, -2.91], ["c", 0.06, -0.45, 0.06, -1.89, 0, -2.31], ["c", -0.15, -1.2, -0.51, -2.1, -1.05, -2.55], ["c", -0.21, -0.18, -0.54, -0.36, -0.81, -0.39], ["c", -0.3, -0.06, -0.84, -0.03, -1.26, 0.06], ["c", -0.93, 0.18, -1.65, 0.6, -2.16, 1.2], ["c", -0.15, 0.21, -0.27, 0.3, -0.39, 0.3], ["c", -0.15, 0, -0.3, -0.09, -0.36, -0.18], ["c", -0.06, -0.09, -0.06, -0.15, -0.06, -3.66], ["c", 0, -3.39, 0, -3.57, 0.06, -3.66], ["c", 0.03, -0.06, 0.09, -0.15, 0.15, -0.18], ["z"]],"w":10.212,"h":14.997},"6":{"d":[["M", 4.98, -14.97], ["c", 0.36, -0.03, 1.2, 0, 1.59, 0.06], ["c", 0.9, 0.15, 1.68, 0.51, 2.25, 1.05], ["c", 0.57, 0.51, 0.87, 1.23, 0.84, 1.98], ["c", -0.03, 0.51, -0.21, 0.9, -0.6, 1.26], ["c", -0.24, 0.24, -0.45, 0.39, -0.75, 0.51], ["c", -0.21, 0.06, -0.27, 0.06, -0.6, 0.06], ["c", -0.33, 0, -0.39, 0, -0.6, -0.06], ["c", -0.3, -0.12, -0.51, -0.27, -0.75, -0.51], ["c", -0.39, -0.36, -0.57, -0.78, -0.57, -1.26], ["c", 0, -0.27, 0, -0.3, 0.09, -0.42], ["c", 0.03, -0.09, 0.18, -0.21, 0.3, -0.3], ["c", 0.12, -0.09, 0.3, -0.21, 0.39, -0.27], ["c", 0.09, -0.06, 0.21, -0.18, 0.27, -0.24], ["c", 0.06, -0.12, 0.09, -0.15, 0.09, -0.33], ["c", 0, -0.18, -0.03, -0.24, -0.09, -0.36], ["c", -0.24, -0.39, -0.75, -0.6, -1.38, -0.57], ["c", -0.54, 0.03, -0.9, 0.18, -1.23, 0.48], ["c", -0.81, 0.72, -1.08, 2.16, -0.96, 5.37], ["l", 0, 0.63], ["l", 0.3, -0.12], ["c", 0.78, -0.27, 1.29, -0.33, 2.1, -0.27], ["c", 1.47, 0.12, 2.49, 0.54, 3.27, 1.29], ["c", 0.48, 0.51, 0.81, 1.11, 0.96, 1.89], ["c", 0.06, 0.27, 0.06, 0.42, 0.06, 0.93], ["c", 0, 0.54, 0, 0.69, -0.06, 0.96], ["c", -0.15, 0.78, -0.48, 1.38, -0.96, 1.89], ["c", -0.54, 0.51, -1.17, 0.87, -1.98, 1.08], ["c", -1.14, 0.3, -2.4, 0.33, -3.24, 0.03], ["c", -1.5, -0.48, -2.64, -1.89, -3.27, -4.02], ["c", -0.36, -1.23, -0.51, -2.82, -0.42, -4.08], ["c", 0.3, -3.66, 2.28, -6.3, 4.95, -6.66], ["z"], ["m", 0.66, 7.41], ["c", -0.27, -0.09, -0.81, -0.12, -1.08, -0.06], ["c", -0.72, 0.18, -1.08, 0.69, -1.23, 1.71], ["c", -0.06, 0.54, -0.06, 3, 0, 3.54], ["c", 0.18, 1.26, 0.72, 1.77, 1.8, 1.74], ["c", 0.39, -0.03, 0.63, -0.09, 0.9, -0.27], ["c", 0.66, -0.42, 0.9, -1.32, 0.9, -3.24], ["c", 0, -2.22, -0.36, -3.12, -1.29, -3.42], ["z"]],"w":9.956,"h":14.982},"7":{"d":[["M", 0.21, -14.97], ["c", 0.21, -0.06, 0.45, 0, 0.54, 0.15], ["c", 0.06, 0.09, 0.06, 0.15, 0.06, 0.39], ["c", 0, 0.24, 0, 0.33, 0.06, 0.42], ["c", 0.06, 0.12, 0.21, 0.24, 0.27, 0.24], ["c", 0.03, 0, 0.12, -0.12, 0.24, -0.21], ["c", 0.96, -1.2, 2.58, -1.35, 3.99, -0.42], ["c", 0.15, 0.12, 0.42, 0.3, 0.54, 0.45], ["c", 0.48, 0.39, 0.81, 0.57, 1.29, 0.6], ["c", 0.69, 0.03, 1.5, -0.3, 2.13, -0.87], ["c", 0.09, -0.09, 0.27, -0.3, 0.39, -0.45], ["c", 0.12, -0.15, 0.24, -0.27, 0.3, -0.3], ["c", 0.18, -0.06, 0.39, 0.03, 0.51, 0.21], ["c", 0.06, 0.18, 0.06, 0.24, -0.27, 0.72], ["c", -0.18, 0.24, -0.54, 0.78, -0.78, 1.17], ["c", -2.37, 3.54, -3.54, 6.27, -3.87, 9], ["c", -0.03, 0.33, -0.03, 0.66, -0.03, 1.26], ["c", 0, 0.9, 0, 1.08, 0.15, 1.89], ["c", 0.06, 0.45, 0.06, 0.48, 0.03, 0.6], ["c", -0.06, 0.09, -0.21, 0.21, -0.3, 0.21], ["c", -0.03, 0, -0.27, -0.06, -0.54, -0.15], ["c", -0.84, -0.27, -1.11, -0.3, -1.65, -0.3], ["c", -0.57, 0, -0.84, 0.03, -1.56, 0.27], ["c", -0.6, 0.18, -0.69, 0.21, -0.81, 0.15], ["c", -0.12, -0.06, -0.21, -0.18, -0.21, -0.3], ["c", 0, -0.15, 0.6, -1.44, 1.2, -2.61], ["c", 1.14, -2.22, 2.73, -4.68, 5.1, -8.01], ["c", 0.21, -0.27, 0.36, -0.48, 0.33, -0.48], ["c", 0, 0, -0.12, 0.06, -0.27, 0.12], ["c", -0.54, 0.3, -0.99, 0.39, -1.56, 0.39], ["c", -0.75, 0.03, -1.2, -0.18, -1.83, -0.75], ["c", -0.99, -0.9, -1.83, -1.17, -2.31, -0.72], ["c", -0.18, 0.15, -0.36, 0.51, -0.45, 0.84], ["c", -0.06, 0.24, -0.06, 0.33, -0.09, 1.98], ["c", 0, 1.62, -0.03, 1.74, -0.06, 1.8], ["c", -0.15, 0.24, -0.54, 0.24, -0.69, 0], ["c", -0.06, -0.09, -0.06, -0.15, -0.06, -3.57], ["c", 0, -3.42, 0, -3.48, 0.06, -3.57], ["c", 0.03, -0.06, 0.09, -0.12, 0.15, -0.15], ["z"]],"w":10.561,"h":15.093},"8":{"d":[["M", 4.98, -14.97], ["c", 0.33, -0.03, 1.02, -0.03, 1.32, 0], ["c", 1.32, 0.12, 2.49, 0.6, 3.21, 1.32], ["c", 0.39, 0.39, 0.66, 0.81, 0.78, 1.29], ["c", 0.09, 0.36, 0.09, 1.08, 0, 1.44], ["c", -0.21, 0.84, -0.66, 1.59, -1.59, 2.55], ["l", -0.3, 0.3], ["l", 0.27, 0.18], ["c", 1.47, 0.93, 2.31, 2.31, 2.25, 3.75], ["c", -0.03, 0.75, -0.24, 1.35, -0.63, 1.95], ["c", -0.45, 0.66, -1.02, 1.14, -1.83, 1.53], ["c", -1.8, 0.87, -4.2, 0.87, -6, 0.03], ["c", -1.62, -0.78, -2.52, -2.16, -2.46, -3.66], ["c", 0.06, -0.99, 0.54, -1.77, 1.8, -2.97], ["c", 0.54, -0.51, 0.54, -0.54, 0.48, -0.57], ["c", -0.39, -0.27, -0.96, -0.78, -1.2, -1.14], ["c", -0.75, -1.11, -0.87, -2.4, -0.3, -3.6], ["c", 0.69, -1.35, 2.25, -2.25, 4.2, -2.4], ["z"], ["m", 1.53, 0.69], ["c", -0.42, -0.09, -1.11, -0.12, -1.38, -0.06], ["c", -0.3, 0.06, -0.6, 0.18, -0.81, 0.3], ["c", -0.21, 0.12, -0.6, 0.51, -0.72, 0.72], ["c", -0.51, 0.87, -0.42, 1.89, 0.21, 2.52], ["c", 0.21, 0.21, 0.36, 0.3, 1.95, 1.23], ["c", 0.96, 0.54, 1.74, 0.99, 1.77, 1.02], ["c", 0.09, 0, 0.63, -0.6, 0.99, -1.11], ["c", 0.21, -0.36, 0.48, -0.87, 0.57, -1.23], ["c", 0.06, -0.24, 0.06, -0.36, 0.06, -0.72], ["c", 0, -0.45, -0.03, -0.66, -0.15, -0.99], ["c", -0.39, -0.81, -1.29, -1.44, -2.49, -1.68], ["z"], ["m", -1.44, 8.07], ["l", -1.89, -1.08], ["c", -0.03, 0, -0.18, 0.15, -0.39, 0.33], ["c", -1.2, 1.08, -1.65, 1.95, -1.59, 3], ["c", 0.09, 1.59, 1.35, 2.85, 3.21, 3.24], ["c", 0.33, 0.06, 0.45, 0.06, 0.93, 0.06], ["c", 0.63, -0, 0.81, -0.03, 1.29, -0.27], ["c", 0.9, -0.42, 1.47, -1.41, 1.41, -2.4], ["c", -0.06, -0.66, -0.39, -1.29, -0.9, -1.65], ["c", -0.12, -0.09, -1.05, -0.63, -2.07, -1.23], ["z"]],"w":10.926,"h":14.989},"9":{"d":[["M", 4.23, -14.97], ["c", 0.42, -0.03, 1.29, 0, 1.62, 0.06], ["c", 0.51, 0.12, 0.93, 0.3, 1.38, 0.57], ["c", 1.53, 1.02, 2.52, 3.24, 2.73, 5.94], ["c", 0.18, 2.55, -0.48, 4.98, -1.83, 6.57], ["c", -1.05, 1.26, -2.4, 1.89, -3.93, 1.83], ["c", -1.23, -0.06, -2.31, -0.45, -3.03, -1.14], ["c", -0.57, -0.51, -0.87, -1.23, -0.84, -1.98], ["c", 0.03, -0.51, 0.21, -0.9, 0.6, -1.26], ["c", 0.24, -0.24, 0.45, -0.39, 0.75, -0.51], ["c", 0.21, -0.06, 0.27, -0.06, 0.6, -0.06], ["c", 0.33, -0, 0.39, -0, 0.6, 0.06], ["c", 0.3, 0.12, 0.51, 0.27, 0.75, 0.51], ["c", 0.39, 0.36, 0.57, 0.78, 0.57, 1.26], ["c", 0, 0.27, 0, 0.3, -0.09, 0.42], ["c", -0.03, 0.09, -0.18, 0.21, -0.3, 0.3], ["c", -0.12, 0.09, -0.3, 0.21, -0.39, 0.27], ["c", -0.09, 0.06, -0.21, 0.18, -0.27, 0.24], ["c", -0.06, 0.12, -0.06, 0.15, -0.06, 0.33], ["c", 0, 0.18, 0, 0.24, 0.06, 0.36], ["c", 0.24, 0.39, 0.75, 0.6, 1.38, 0.57], ["c", 0.54, -0.03, 0.9, -0.18, 1.23, -0.48], ["c", 0.81, -0.72, 1.08, -2.16, 0.96, -5.37], ["l", 0, -0.63], ["l", -0.3, 0.12], ["c", -0.78, 0.27, -1.29, 0.33, -2.1, 0.27], ["c", -1.47, -0.12, -2.49, -0.54, -3.27, -1.29], ["c", -0.48, -0.51, -0.81, -1.11, -0.96, -1.89], ["c", -0.06, -0.27, -0.06, -0.42, -0.06, -0.96], ["c", 0, -0.51, 0, -0.66, 0.06, -0.93], ["c", 0.15, -0.78, 0.48, -1.38, 0.96, -1.89], ["c", 0.15, -0.12, 0.33, -0.27, 0.42, -0.36], ["c", 0.69, -0.51, 1.62, -0.81, 2.76, -0.93], ["z"], ["m", 1.17, 0.66], ["c", -0.21, -0.06, -0.57, -0.06, -0.81, -0.03], ["c", -0.78, 0.12, -1.26, 0.69, -1.41, 1.74], ["c", -0.12, 0.63, -0.15, 1.95, -0.09, 2.79], ["c", 0.12, 1.71, 0.63, 2.4, 1.77, 2.46], ["c", 1.08, 0.03, 1.62, -0.48, 1.8, -1.74], ["c", 0.06, -0.54, 0.06, -3, 0, -3.54], ["c", -0.15, -1.05, -0.51, -1.53, -1.26, -1.68], ["z"]],"w":9.959,"h":14.986},"f":{"d":[["M", 9.93, -14.28], ["c", 1.53, -0.18, 2.88, 0.45, 3.12, 1.5], ["c", 0.12, 0.51, 0, 1.32, -0.27, 1.86], ["c", -0.15, 0.3, -0.42, 0.57, -0.63, 0.69], ["c", -0.69, 0.36, -1.56, 0.03, -1.83, -0.69], ["c", -0.09, -0.24, -0.09, -0.69, 0, -0.87], ["c", 0.06, -0.12, 0.21, -0.24, 0.45, -0.42], ["c", 0.42, -0.24, 0.57, -0.45, 0.6, -0.72], ["c", 0.03, -0.33, -0.09, -0.39, -0.63, -0.42], ["c", -0.3, 0, -0.45, 0, -0.6, 0.03], ["c", -0.81, 0.21, -1.35, 0.93, -1.74, 2.46], ["c", -0.06, 0.27, -0.48, 2.25, -0.48, 2.31], ["c", 0, 0.03, 0.39, 0.03, 0.9, 0.03], ["c", 0.72, 0, 0.9, 0, 0.99, 0.06], ["c", 0.42, 0.15, 0.45, 0.72, 0.03, 0.9], ["c", -0.12, 0.06, -0.24, 0.06, -1.17, 0.06], ["l", -1.05, 0], ["l", -0.78, 2.55], ["c", -0.45, 1.41, -0.87, 2.79, -0.96, 3.06], ["c", -0.87, 2.37, -2.37, 4.74, -3.78, 5.91], ["c", -1.05, 0.9, -2.04, 1.23, -3.09, 1.08], ["c", -1.11, -0.18, -1.89, -0.78, -2.04, -1.59], ["c", -0.12, -0.66, 0.15, -1.71, 0.54, -2.19], ["c", 0.69, -0.75, 1.86, -0.54, 2.22, 0.39], ["c", 0.06, 0.15, 0.09, 0.27, 0.09, 0.48], ["c", -0, 0.24, -0.03, 0.27, -0.12, 0.42], ["c", -0.03, 0.09, -0.15, 0.18, -0.27, 0.27], ["c", -0.09, 0.06, -0.27, 0.21, -0.36, 0.27], ["c", -0.24, 0.18, -0.36, 0.36, -0.39, 0.6], ["c", -0.03, 0.33, 0.09, 0.39, 0.63, 0.42], ["c", 0.42, 0, 0.63, -0.03, 0.9, -0.15], ["c", 0.6, -0.3, 0.96, -0.96, 1.38, -2.64], ["c", 0.09, -0.42, 0.63, -2.55, 1.17, -4.77], ["l", 1.02, -4.08], ["c", -0, -0.03, -0.36, -0.03, -0.81, -0.03], ["c", -0.72, 0, -0.81, 0, -0.93, -0.06], ["c", -0.42, -0.18, -0.39, -0.75, 0.03, -0.9], ["c", 0.09, -0.06, 0.27, -0.06, 1.05, -0.06], ["l", 0.96, 0], ["l", 0, -0.09], ["c", 0.06, -0.18, 0.3, -0.72, 0.51, -1.17], ["c", 1.2, -2.46, 3.3, -4.23, 5.34, -4.5], ["z"]],"w":16.155,"h":19.445},"m":{"d":[["M", 2.79, -8.91], ["c", 0.09, 0, 0.3, -0.03, 0.45, -0.03], ["c", 0.24, 0.03, 0.3, 0.03, 0.45, 0.12], ["c", 0.36, 0.15, 0.63, 0.54, 0.75, 1.02], ["l", 0.03, 0.21], ["l", 0.33, -0.3], ["c", 0.69, -0.69, 1.38, -1.02, 2.07, -1.02], ["c", 0.27, 0, 0.33, 0, 0.48, 0.06], ["c", 0.21, 0.09, 0.48, 0.36, 0.63, 0.6], ["c", 0.03, 0.09, 0.12, 0.27, 0.18, 0.42], ["c", 0.03, 0.15, 0.09, 0.27, 0.12, 0.27], ["c", 0, 0, 0.09, -0.09, 0.18, -0.21], ["c", 0.33, -0.39, 0.87, -0.81, 1.29, -0.99], ["c", 0.78, -0.33, 1.47, -0.21, 2.01, 0.33], ["c", 0.3, 0.33, 0.48, 0.69, 0.6, 1.14], ["c", 0.09, 0.42, 0.06, 0.54, -0.54, 3.06], ["c", -0.33, 1.29, -0.57, 2.4, -0.57, 2.43], ["c", 0, 0.12, 0.09, 0.21, 0.21, 0.21], ["c", 0.24, -0, 0.75, -0.3, 1.2, -0.72], ["c", 0.45, -0.39, 0.6, -0.45, 0.78, -0.27], ["c", 0.18, 0.18, 0.09, 0.36, -0.45, 0.87], ["c", -1.05, 0.96, -1.83, 1.47, -2.58, 1.71], ["c", -0.93, 0.33, -1.53, 0.21, -1.8, -0.33], ["c", -0.06, -0.15, -0.06, -0.21, -0.06, -0.45], ["c", 0, -0.24, 0.03, -0.48, 0.6, -2.82], ["c", 0.42, -1.71, 0.6, -2.64, 0.63, -2.79], ["c", 0.03, -0.57, -0.3, -0.75, -0.84, -0.48], ["c", -0.24, 0.12, -0.54, 0.39, -0.66, 0.63], ["c", -0.03, 0.09, -0.42, 1.38, -0.9, 3], ["c", -0.9, 3.15, -0.84, 3, -1.14, 3.15], ["l", -0.15, 0.09], ["l", -0.78, 0], ["c", -0.6, 0, -0.78, 0, -0.84, -0.06], ["c", -0.09, -0.03, -0.18, -0.18, -0.18, -0.27], ["c", 0, -0.03, 0.36, -1.38, 0.84, -2.97], ["c", 0.57, -2.04, 0.81, -2.97, 0.84, -3.12], ["c", 0.03, -0.54, -0.3, -0.72, -0.84, -0.45], ["c", -0.24, 0.12, -0.57, 0.42, -0.66, 0.63], ["c", -0.06, 0.09, -0.51, 1.44, -1.05, 2.97], ["c", -0.51, 1.56, -0.99, 2.85, -0.99, 2.91], ["c", -0.06, 0.12, -0.21, 0.24, -0.36, 0.3], ["c", -0.12, 0.06, -0.21, 0.06, -0.9, 0.06], ["c", -0.6, 0, -0.78, 0, -0.84, -0.06], ["c", -0.09, -0.03, -0.18, -0.18, -0.18, -0.27], ["c", 0, -0.03, 0.45, -1.38, 0.99, -2.97], ["c", 1.05, -3.18, 1.05, -3.18, 0.93, -3.45], ["c", -0.12, -0.27, -0.39, -0.3, -0.72, -0.15], ["c", -0.54, 0.27, -1.14, 1.17, -1.56, 2.4], ["c", -0.06, 0.15, -0.15, 0.3, -0.18, 0.36], ["c", -0.21, 0.21, -0.57, 0.27, -0.72, 0.09], ["c", -0.09, -0.09, -0.06, -0.21, 0.06, -0.63], ["c", 0.48, -1.26, 1.26, -2.46, 2.01, -3.21], ["c", 0.57, -0.54, 1.2, -0.87, 1.83, -1.02], ["z"]],"w":14.687,"h":9.126},"p":{"d":[["M", 1.92, -8.7], ["c", 0.27, -0.09, 0.81, -0.06, 1.11, 0.03], ["c", 0.54, 0.18, 0.93, 0.51, 1.17, 0.99], ["c", 0.09, 0.15, 0.15, 0.33, 0.18, 0.36], ["l", -0, 0.12], ["l", 0.3, -0.27], ["c", 0.66, -0.6, 1.35, -1.02, 2.13, -1.2], ["c", 0.21, -0.06, 0.33, -0.06, 0.78, -0.06], ["c", 0.45, 0, 0.51, 0, 0.84, 0.09], ["c", 1.29, 0.33, 2.07, 1.32, 2.25, 2.79], ["c", 0.09, 0.81, -0.09, 2.01, -0.45, 2.79], ["c", -0.54, 1.26, -1.86, 2.55, -3.18, 3.03], ["c", -0.45, 0.18, -0.81, 0.24, -1.29, 0.24], ["c", -0.69, -0.03, -1.35, -0.18, -1.86, -0.45], ["c", -0.3, -0.15, -0.51, -0.18, -0.69, -0.09], ["c", -0.09, 0.03, -0.18, 0.09, -0.18, 0.12], ["c", -0.09, 0.12, -1.05, 2.94, -1.05, 3.06], ["c", 0, 0.24, 0.18, 0.48, 0.51, 0.63], ["c", 0.18, 0.06, 0.54, 0.15, 0.75, 0.15], ["c", 0.21, 0, 0.36, 0.06, 0.42, 0.18], ["c", 0.12, 0.18, 0.06, 0.42, -0.12, 0.54], ["c", -0.09, 0.03, -0.15, 0.03, -0.78, 0], ["c", -1.98, -0.15, -3.81, -0.15, -5.79, 0], ["c", -0.63, 0.03, -0.69, 0.03, -0.78, 0], ["c", -0.24, -0.15, -0.24, -0.57, 0.03, -0.66], ["c", 0.06, -0.03, 0.48, -0.09, 0.99, -0.12], ["c", 0.87, -0.06, 1.11, -0.09, 1.35, -0.21], ["c", 0.18, -0.06, 0.33, -0.18, 0.39, -0.3], ["c", 0.06, -0.12, 3.24, -9.42, 3.27, -9.6], ["c", 0.06, -0.33, 0.03, -0.57, -0.15, -0.69], ["c", -0.09, -0.06, -0.12, -0.06, -0.3, -0.06], ["c", -0.69, 0.06, -1.53, 1.02, -2.28, 2.61], ["c", -0.09, 0.21, -0.21, 0.45, -0.27, 0.51], ["c", -0.09, 0.12, -0.33, 0.24, -0.48, 0.24], ["c", -0.18, 0, -0.36, -0.15, -0.36, -0.3], ["c", 0, -0.24, 0.78, -1.83, 1.26, -2.55], ["c", 0.72, -1.11, 1.47, -1.74, 2.28, -1.92], ["z"], ["m", 5.37, 1.47], ["c", -0.27, -0.12, -0.75, -0.03, -1.14, 0.21], ["c", -0.75, 0.48, -1.47, 1.68, -1.89, 3.15], ["c", -0.45, 1.47, -0.42, 2.34, 0, 2.7], ["c", 0.45, 0.39, 1.26, 0.21, 1.83, -0.36], ["c", 0.51, -0.51, 0.99, -1.68, 1.38, -3.27], ["c", 0.3, -1.17, 0.33, -1.74, 0.15, -2.13], ["c", -0.09, -0.15, -0.15, -0.21, -0.33, -0.3], ["z"]],"w":14.689,"h":13.127},"r":{"d":[["M", 6.33, -9.12], ["c", 0.27, -0.03, 0.93, 0, 1.2, 0.06], ["c", 0.84, 0.21, 1.23, 0.81, 1.02, 1.53], ["c", -0.24, 0.75, -0.9, 1.17, -1.56, 0.96], ["c", -0.33, -0.09, -0.51, -0.3, -0.66, -0.75], ["c", -0.03, -0.12, -0.09, -0.24, -0.12, -0.3], ["c", -0.09, -0.15, -0.3, -0.24, -0.48, -0.24], ["c", -0.57, 0, -1.38, 0.54, -1.65, 1.08], ["c", -0.06, 0.15, -0.33, 1.17, -0.9, 3.27], ["c", -0.57, 2.31, -0.81, 3.12, -0.87, 3.21], ["c", -0.03, 0.06, -0.12, 0.15, -0.18, 0.21], ["l", -0.12, 0.06], ["l", -0.81, 0.03], ["c", -0.69, 0, -0.81, 0, -0.9, -0.03], ["c", -0.09, -0.06, -0.18, -0.21, -0.18, -0.3], ["c", 0, -0.06, 0.39, -1.62, 0.9, -3.51], ["c", 0.84, -3.24, 0.87, -3.45, 0.87, -3.72], ["c", 0, -0.21, 0, -0.27, -0.03, -0.36], ["c", -0.12, -0.15, -0.21, -0.24, -0.42, -0.24], ["c", -0.24, 0, -0.45, 0.15, -0.78, 0.42], ["c", -0.33, 0.36, -0.45, 0.54, -0.72, 1.14], ["c", -0.03, 0.12, -0.21, 0.24, -0.36, 0.27], ["c", -0.12, 0, -0.15, 0, -0.24, -0.06], ["c", -0.18, -0.12, -0.18, -0.21, -0.06, -0.54], ["c", 0.21, -0.57, 0.42, -0.93, 0.78, -1.32], ["c", 0.54, -0.51, 1.2, -0.81, 1.95, -0.87], ["c", 0.81, -0.03, 1.53, 0.3, 1.92, 0.87], ["l", 0.12, 0.18], ["l", 0.09, -0.09], ["c", 0.57, -0.45, 1.41, -0.84, 2.19, -0.96], ["z"]],"w":9.41,"h":9.132},"s":{"d":[["M", 4.47, -8.73], ["c", 0.09, 0, 0.36, -0.03, 0.57, -0.03], ["c", 0.75, 0.03, 1.29, 0.24, 1.71, 0.63], ["c", 0.51, 0.54, 0.66, 1.26, 0.36, 1.83], ["c", -0.24, 0.42, -0.63, 0.57, -1.11, 0.42], ["c", -0.33, -0.09, -0.6, -0.36, -0.6, -0.57], ["c", 0, -0.03, 0.06, -0.21, 0.15, -0.39], ["c", 0.12, -0.21, 0.15, -0.33, 0.18, -0.48], ["c", 0, -0.24, -0.06, -0.48, -0.15, -0.6], ["c", -0.15, -0.21, -0.42, -0.24, -0.75, -0.15], ["c", -0.27, 0.06, -0.48, 0.18, -0.69, 0.36], ["c", -0.39, 0.39, -0.51, 0.96, -0.33, 1.38], ["c", 0.09, 0.21, 0.42, 0.51, 0.78, 0.72], ["c", 1.11, 0.69, 1.59, 1.11, 1.89, 1.68], ["c", 0.21, 0.39, 0.24, 0.78, 0.15, 1.29], ["c", -0.18, 1.2, -1.17, 2.16, -2.52, 2.52], ["c", -1.02, 0.24, -1.95, 0.12, -2.7, -0.42], ["c", -0.72, -0.51, -0.99, -1.47, -0.6, -2.19], ["c", 0.24, -0.48, 0.72, -0.63, 1.17, -0.42], ["c", 0.33, 0.18, 0.54, 0.45, 0.57, 0.81], ["c", 0, 0.21, -0.03, 0.3, -0.33, 0.51], ["c", -0.33, 0.24, -0.39, 0.42, -0.27, 0.69], ["c", 0.06, 0.15, 0.21, 0.27, 0.45, 0.33], ["c", 0.3, 0.09, 0.87, 0.09, 1.2, -0], ["c", 0.75, -0.21, 1.23, -0.72, 1.29, -1.35], ["c", 0.03, -0.42, -0.15, -0.81, -0.54, -1.2], ["c", -0.24, -0.24, -0.48, -0.42, -1.41, -1.02], ["c", -0.69, -0.42, -1.05, -0.93, -1.05, -1.47], ["c", 0, -0.39, 0.12, -0.87, 0.3, -1.23], ["c", 0.27, -0.57, 0.78, -1.05, 1.38, -1.35], ["c", 0.24, -0.12, 0.63, -0.27, 0.9, -0.3], ["z"]],"w":6.632,"h":8.758},"z":{"d":[["M", 2.64, -7.95], ["c", 0.36, -0.09, 0.81, -0.03, 1.71, 0.27], ["c", 0.78, 0.21, 0.96, 0.27, 1.74, 0.3], ["c", 0.87, 0.06, 1.02, 0.03, 1.38, -0.21], ["c", 0.21, -0.15, 0.33, -0.15, 0.48, -0.06], ["c", 0.15, 0.09, 0.21, 0.3, 0.15, 0.45], ["c", -0.03, 0.06, -1.26, 1.26, -2.76, 2.67], ["l", -2.73, 2.55], ["l", 0.54, 0.03], ["c", 0.54, 0.03, 0.72, 0.03, 2.01, 0.15], ["c", 0.36, 0.03, 0.9, 0.06, 1.2, 0.09], ["c", 0.66, 0, 0.81, -0.03, 1.02, -0.24], ["c", 0.3, -0.3, 0.39, -0.72, 0.27, -1.23], ["c", -0.06, -0.27, -0.06, -0.27, -0.03, -0.39], ["c", 0.15, -0.3, 0.54, -0.27, 0.69, 0.03], ["c", 0.15, 0.33, 0.27, 1.02, 0.27, 1.5], ["c", 0, 1.47, -1.11, 2.7, -2.52, 2.79], ["c", -0.57, 0.03, -1.02, -0.09, -2.01, -0.51], ["c", -1.02, -0.42, -1.23, -0.48, -2.13, -0.54], ["c", -0.81, -0.06, -0.96, -0.03, -1.26, 0.18], ["c", -0.12, 0.06, -0.24, 0.12, -0.27, 0.12], ["c", -0.27, 0, -0.45, -0.3, -0.36, -0.51], ["c", 0.03, -0.06, 1.32, -1.32, 2.91, -2.79], ["l", 2.88, -2.73], ["c", -0.03, 0, -0.21, 0.03, -0.42, 0.06], ["c", -0.21, 0.03, -0.78, 0.09, -1.23, 0.12], ["c", -1.11, 0.12, -1.23, 0.15, -1.95, 0.27], ["c", -0.72, 0.15, -1.17, 0.18, -1.29, 0.09], ["c", -0.27, -0.18, -0.21, -0.75, 0.12, -1.26], ["c", 0.39, -0.6, 0.93, -1.02, 1.59, -1.2], ["z"]],"w":8.573,"h":8.743},"+":{"d":[["M", 3.48, -11.19], ["c", 0.18, -0.09, 0.36, -0.09, 0.54, 0], ["c", 0.18, 0.09, 0.24, 0.15, 0.33, 0.3], ["l", 0.06, 0.15], ["l", 0, 1.29], ["l", 0, 1.29], ["l", 1.29, 0], ["c", 1.23, 0, 1.29, 0, 1.41, 0.06], ["c", 0.06, 0.03, 0.15, 0.09, 0.18, 0.12], ["c", 0.12, 0.09, 0.21, 0.33, 0.21, 0.48], ["c", 0, 0.15, -0.09, 0.39, -0.21, 0.48], ["c", -0.03, 0.03, -0.12, 0.09, -0.18, 0.12], ["c", -0.12, 0.06, -0.18, 0.06, -1.41, 0.06], ["l", -1.29, 0], ["l", 0, 1.29], ["c", 0, 1.23, 0, 1.29, -0.06, 1.41], ["c", -0.09, 0.18, -0.15, 0.24, -0.3, 0.33], ["c", -0.21, 0.09, -0.39, 0.09, -0.57, 0], ["c", -0.18, -0.09, -0.24, -0.15, -0.33, -0.33], ["c", -0.06, -0.12, -0.06, -0.18, -0.06, -1.41], ["l", 0, -1.29], ["l", -1.29, 0], ["c", -1.23, 0, -1.29, 0, -1.41, -0.06], ["c", -0.18, -0.09, -0.24, -0.15, -0.33, -0.33], ["c", -0.09, -0.18, -0.09, -0.36, 0, -0.54], ["c", 0.09, -0.18, 0.15, -0.24, 0.33, -0.33], ["l", 0.15, -0.06], ["l", 1.26, 0], ["l", 1.29, 0], ["l", 0, -1.29], ["c", 0, -1.23, 0, -1.29, 0.06, -1.41], ["c", 0.09, -0.18, 0.15, -0.24, 0.33, -0.33], ["z"]],"w":7.507,"h":7.515},",":{"d":[["M", 1.32, -3.36], ["c", 0.57, -0.15, 1.17, 0.03, 1.59, 0.45], ["c", 0.45, 0.45, 0.6, 0.96, 0.51, 1.89], ["c", -0.09, 1.23, -0.42, 2.46, -0.99, 3.93], ["c", -0.3, 0.72, -0.72, 1.62, -0.78, 1.68], ["c", -0.18, 0.21, -0.51, 0.18, -0.66, -0.06], ["c", -0.03, -0.06, -0.06, -0.15, -0.06, -0.18], ["c", 0, -0.06, 0.12, -0.33, 0.24, -0.63], ["c", 0.84, -1.8, 1.02, -2.61, 0.69, -3.24], ["c", -0.12, -0.24, -0.27, -0.36, -0.75, -0.6], ["c", -0.36, -0.15, -0.42, -0.21, -0.6, -0.39], ["c", -0.69, -0.69, -0.69, -1.71, 0, -2.4], ["c", 0.21, -0.21, 0.51, -0.39, 0.81, -0.45], ["z"]],"w":3.452,"h":8.143},"-":{"d":[["M", 0.18, -5.34], ["c", 0.09, -0.06, 0.15, -0.06, 2.31, -0.06], ["c", 2.46, 0, 2.37, 0, 2.46, 0.21], ["c", 0.12, 0.21, 0.03, 0.42, -0.15, 0.54], ["c", -0.09, 0.06, -0.15, 0.06, -2.28, 0.06], ["c", -2.16, 0, -2.22, 0, -2.31, -0.06], ["c", -0.27, -0.15, -0.27, -0.54, -0.03, -0.69], ["z"]],"w":5.001,"h":0.81},".":{"d":[["M", 1.32, -3.36], ["c", 1.05, -0.27, 2.1, 0.57, 2.1, 1.65], ["c", 0, 1.08, -1.05, 1.92, -2.1, 1.65], ["c", -0.9, -0.21, -1.5, -1.14, -1.26, -2.04], ["c", 0.12, -0.63, 0.63, -1.11, 1.26, -1.26], ["z"]],"w":3.413,"h":3.402}}
Score.Key = function() {
};

Score.Key.prototype = new Score.StaffElement();
Score.Key.prototype.type = 'Key';
Score.Key.prototype.clone = function() {
  var k = new Score.Key;
  k.sharps = this.sharps.slice(0);
  k.flats = this.flats.slice(0);
  k.names = this.names.slice(0);
  return k;
};
Score.Key.prototype.render = function(svg, xoffset, yoffset) {
  var map = {};
  switch(this.part.clef) {
  case 'treble':
    map = {
      'a': 5,
      'b': 4,
      'c': 3,
      'd': 2,
      'e': 1,
      'f': 0,
      'g': -1
    };
    break;
  case 'bass':
    map = {
      'a': 7,
      'b': 6,
      'c': 5,
      'd': 4,
      'e': 3,
      'f': 2,
      'g': 1
    };
    break;
  }

  var sharp = Glyph.glyphs['accidentals.sharp'];
  var flat = Glyph.glyphs['accidentals.flat'];
  for (var y, i=0; i < this.sharps.length; ++i, xoffset += 10) {
    y = -sharp.h/2 + map[this.sharps[i]] * Score.Staff.LINE_HEIGHT/2;
    svg.path(sharp.d).move(xoffset, y + yoffset)
  }

  for (var y, i=0; i < this.flats.length; ++i, xoffset += 10) {
    y = -3*flat.h/4 + map[this.flats[i]] * Score.Staff.LINE_HEIGHT/2;
    svg.path(flat.d).move(xoffset, y + yoffset)
  }

  return xoffset + 5;
};

Score.Key.parse = function(key) {
  for (var k in Score.Keys) {
    if (Score.Keys[k].names.indexOf(key) != -1)
      return Score.Keys[k];
  }

  throw "Unrecognized key: "+key;
};

Score.Keys = {};
Score.Keys.C_MAJOR = new Score.Key();
Score.Keys.C_MAJOR.sharps = [];
Score.Keys.C_MAJOR.flats = [];
Score.Keys.C_MAJOR.names = ["c", "C", "cmaj", "Cmaj", "CMaj"];
Score.Keys.A_MINOR = new Score.Key();
Score.Keys.A_MINOR.sharps = [];
Score.Keys.A_MINOR.flats = [];
Score.Keys.A_MINOR.names = ["am", "Am", "amin", "Amin", "AMin"];
Score.Keys.G_MAJOR = new Score.Key();
Score.Keys.G_MAJOR.sharps = ["f"];
Score.Keys.G_MAJOR.flats = [];
Score.Keys.G_MAJOR.names = ["g", "G", "gmaj", "Gmaj", "GMaj"];
Score.Keys.E_MINOR = new Score.Key();
Score.Keys.E_MINOR.sharps = ["f"];
Score.Keys.E_MINOR.flats = [];
Score.Keys.E_MINOR.names = ["em", "Em", "emin", "Emin", "EMin"];
Score.Keys.D_MAJOR = new Score.Key();
Score.Keys.D_MAJOR.sharps = ["f", "c"];
Score.Keys.D_MAJOR.flats = [];
Score.Keys.D_MAJOR.names = ["d", "D", "dmaj", "Dmaj", "DMaj"];
Score.Keys.B_MINOR = new Score.Key();
Score.Keys.B_MINOR.sharps = ["f", "c"];
Score.Keys.B_MINOR.flats = [];
Score.Keys.B_MINOR.names = ["bm", "Bm", "bmin", "Bmin", "BMin"];
Score.Keys.A_MAJOR = new Score.Key();
Score.Keys.A_MAJOR.sharps = ["f", "c", "g"];
Score.Keys.A_MAJOR.flats = [];
Score.Keys.A_MAJOR.names = ["a", "A", "amaj", "Amaj", "AMaj"];
Score.Keys.F_SHARP_MINOR = new Score.Key();
Score.Keys.F_SHARP_MINOR.sharps = ["f", "c", "g"];
Score.Keys.F_SHARP_MINOR.flats = [];
Score.Keys.F_SHARP_MINOR.names = ["f#m", "F#m", "f#min", "F#min", "F#Min"];
Score.Keys.E_MAJOR = new Score.Key();
Score.Keys.E_MAJOR.sharps = ["f", "c", "g", "d"];
Score.Keys.E_MAJOR.flats = [];
Score.Keys.E_MAJOR.names = ["e", "E", "emaj", "Emaj", "EMaj"];
Score.Keys.C_SHARP_MINOR = new Score.Key();
Score.Keys.C_SHARP_MINOR.sharps = ["f", "c", "g", "d"];
Score.Keys.C_SHARP_MINOR.flats = [];
Score.Keys.C_SHARP_MINOR.names = ["c#m", "C#m", "c#min", "C#min", "C#Min"];
Score.Keys.B_MAJOR = new Score.Key();
Score.Keys.B_MAJOR.sharps = ["f", "c", "g", "d", "a"];
Score.Keys.B_MAJOR.flats = [];
Score.Keys.B_MAJOR.names = ["b", "B", "bmaj", "Bmaj", "BMaj"];
Score.Keys.G_SHARP_MINOR = new Score.Key();
Score.Keys.G_SHARP_MINOR.sharps = ["f", "c", "g", "d", "a"];
Score.Keys.G_SHARP_MINOR.flats = [];
Score.Keys.G_SHARP_MINOR.names = ["g#m", "G#m", "g#min", "G#min", "G#Min"];
Score.Keys.F_SHARP_MAJOR = new Score.Key();
Score.Keys.F_SHARP_MAJOR.sharps = ["f", "c", "g", "d", "a", "e"];
Score.Keys.F_SHARP_MAJOR.flats = [];
Score.Keys.F_SHARP_MAJOR.names = ["f#", "F#", "f#maj", "F#maj", "F#Maj"];
Score.Keys.D_SHARP_MINOR = new Score.Key();
Score.Keys.D_SHARP_MINOR.sharps = ["f", "c", "g", "d", "a", "e"];
Score.Keys.D_SHARP_MINOR.flats = [];
Score.Keys.D_SHARP_MINOR.names = ["d#m", "D#m", "d#min", "D#min", "D#Min"];
Score.Keys.G_FLAT_MAJOR = new Score.Key();
Score.Keys.G_FLAT_MAJOR.sharps = [];
Score.Keys.G_FLAT_MAJOR.flats = ["b", "e", "a", "d", "g", "c"];
Score.Keys.G_FLAT_MAJOR.names = ["gb", "Gb", "gbmaj", "Gbmaj", "GbMaj"];
Score.Keys.E_FLAT_MINOR = new Score.Key();
Score.Keys.E_FLAT_MINOR.sharps = [];
Score.Keys.E_FLAT_MINOR.flats = ["b", "e", "a", "d", "g", "c"];
Score.Keys.E_FLAT_MINOR.names = ["ebm", "Ebm", "ebmin", "Ebmin", "EbMin"];
Score.Keys.D_FLAT_MAJOR = new Score.Key();
Score.Keys.D_FLAT_MAJOR.sharps = [];
Score.Keys.D_FLAT_MAJOR.flats = ["b", "e", "a", "d", "g"];
Score.Keys.D_FLAT_MAJOR.names = ["db", "Db", "dbmaj", "Dbmaj", "DbMaj"];
Score.Keys.B_FLAT_MINOR = new Score.Key();
Score.Keys.B_FLAT_MINOR.sharps = [];
Score.Keys.B_FLAT_MINOR.flats = ["b", "e", "a", "d", "g"];
Score.Keys.B_FLAT_MINOR.names = ["bbm", "Bbm", "bbmin", "Bbmin", "BbMin"];
Score.Keys.A_FLAT_MAJOR = new Score.Key();
Score.Keys.A_FLAT_MAJOR.sharps = [];
Score.Keys.A_FLAT_MAJOR.flats = ["b", "e", "a", "d"];
Score.Keys.A_FLAT_MAJOR.names = ["ab", "Ab", "abmaj", "Abmaj", "AbMaj"];
Score.Keys.F_MINOR = new Score.Key();
Score.Keys.F_MINOR.sharps = [];
Score.Keys.F_MINOR.flats = ["b", "e", "a", "d"];
Score.Keys.F_MINOR.names = ["fm", "Fm", "fmin", "Fmin", "FMin"];
Score.Keys.E_FLAT_MAJOR = new Score.Key();
Score.Keys.E_FLAT_MAJOR.sharps = [];
Score.Keys.E_FLAT_MAJOR.flats = ["b", "e", "a"];
Score.Keys.E_FLAT_MAJOR.names = ["eb", "Eb", "ebmaj", "Ebmaj", "EbMaj"];
Score.Keys.C_MINOR = new Score.Key();
Score.Keys.C_MINOR.sharps = [];
Score.Keys.C_MINOR.flats = ["b", "e", "a"];
Score.Keys.C_MINOR.names = ["cm", "Cm", "cmin", "Cmin", "CMin"];
Score.Keys.B_FLAT_MAJOR = new Score.Key();
Score.Keys.B_FLAT_MAJOR.sharps = [];
Score.Keys.B_FLAT_MAJOR.flats = ["b", "e"];
Score.Keys.B_FLAT_MAJOR.names = ["bb", "Bb", "bbmaj", "Bbmaj", "BbMaj"];
Score.Keys.G_MINOR = new Score.Key();
Score.Keys.G_MINOR.sharps = [];
Score.Keys.G_MINOR.flats = ["b", "e"];
Score.Keys.G_MINOR.names = ["gm", "Gm", "gmin", "Gmin", "GMin"];
Score.Keys.F_MAJOR = new Score.Key();
Score.Keys.F_MAJOR.sharps = [];
Score.Keys.F_MAJOR.flats = ["b"];
Score.Keys.F_MAJOR.names = ["f", "F", "fmaj", "Fmaj", "FMaj"];
Score.Keys.D_MINOR = new Score.Key();
Score.Keys.D_MINOR.sharps = [];
Score.Keys.D_MINOR.flats = ["b"];
Score.Keys.D_MINOR.names = ["dm", "Dm", "dmin", "Dmin", "DMin"];

Score.Tempo = function(value) {
  var match = value.match(/(\d\/\d)\s*=\s*(\d+)/);
  if (!match)
    throw 'Invalid tempo: '+value;

  var bpm = parseInt(match[2]);
  switch(match[1]) {
  case '1/2':
    this._bpm = 2 * bpm;
    break;
  case '1/4':
    this._bpm = bpm;
    break;
  case '1/8':
    this._bpm = bpm / 2;
    break;
  case '1/16':
    this._bpm = bpm / 4;
    break;
  }
};

Score.Tempo.prototype.bpm = function(value) {
  switch(value) {
  case '1/2':
    return this._bpm / 2;
  case '1/4':
    return this._bpm;
  case '1/8':
    return this._bpm * 2;
  case '1/16':
    return this._bpm * 4;
  }
};

Score.Measure = function(voice) {
  this.elements = [];
  this.part = voice;
};

Score.Measure.prototype = new Score.Set();
Score.Measure.prototype.type = 'Measure';

Score.Measure.prototype.push = function(x) {
  this.elements.push(x);
  x.measure = this;
};

Score.Measure.prototype.replace = function(el, newel, rerender) {
  rerender = (rerender === undefined) ? true : rerender;

  if (rerender) {
    for (var i=0; i < this.elements.length; ++i) {
      if (this.elements[i].avatar) {
        this.elements[i].avatar.remove();
        this.elements[i].avatar = null;
      }
    }
  }

  newel.measure = this;
  newel.part = el.part;
  newel.score = el.score;
  newel.prev = el.prev;
  newel.next = el.next;
  if (newel.prev)
    newel.prev.next = newel;
  if (newel.next)
    newel.next.prev = newel;

  var index = this.elements.indexOf(el);
  if (index == -1) {
    this.filter('Chord').elements.forEach(function(chord) {
      index = chord.notes.indexOf(el);
      if (index != -1)
        chord.notes[index] = newel;
    });
  } else {
    this.elements[index] = newel;
  }

  if (rerender) {
    this.prerender(svg0, this.renderYOffset);
    this.part.score.reformatLine(this.renderLineNumber, this.renderXOffset);
  }
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
  for (var e, g, below, i=0; i < this.elements.length; ++i) {
    e = this.elements[i];
    e.render(svg, 0, yoffset);
    if (!this.part.score.options.showIntervals)
      continue;
    if (e.type == 'Note' && (below = this.part.below(e))) {
      if (below.type != 'Note')
        continue;
      below.addText(below.interval(e).name);
    }
  }
};

Score.Measure.prototype.render = function(svg) {
  var x = this.elements[0].avatar.rbox().x;
  var y = this.renderYOffset - Score.Staff.VERTICAL_PADDING/2;

  var w, h, right = this.elements[this.elements.length-1];
  if (right.next && right.next.avatar)
    w = right.next.avatar.rbox().x - x;
  else
    w = right.avatar.rbox().x2 - x;
  h = Score.Staff.HEIGHT + Score.Staff.VERTICAL_PADDING;

  this.avatar = svg.rect(w, h).move(x, y).opacity(0.0);
  this.avatar.back();
  this.bindListeners();
};

Score.Measure.prototype.bindListeners = function() {
  var self = this;
  this.avatar.mousemove(function(e) {
    self.trigger('mousemove', e);
  });
  this.avatar.mousedown(function(e) {
    self.trigger('mousedown', e);
  });
};

Score.Measure.prototype.trigger = function(id, event) {
  var score = this.elements[0].score;
  var scopedId = 'measure.'+id;
  event.scoreTarget = event.scoreTarget || this;
  if (score.eventListeners[scopedId])
    score.eventListeners[scopedId].call(this, event);
};

Score.SEMIBREVE = 32 * (16 * 3) * (16 * 5);
Score.MINIM = Score.SEMIBREVE / 2;
Score.CROCHET = Score.SEMIBREVE / 4;
Score.QUAVER = Score.SEMIBREVE / 8;
Score.QUAVER_TRIPLET = (2 * Score.SEMIBREVE / 8) / 3;
Score.SEMIQUAVER = Score.SEMIBREVE / 16;
Score.SEMIQUAVER_TRIPLET = (2 * Score.SEMIBREVE / 16) / 3;

Score.Meter = function(beatsPerMeasure, beatValue) {
  this.beatsPerMeasure = parseInt(beatsPerMeasure);
  this.beatValue = parseInt(beatValue);
  switch(parseInt(beatValue)) {
  case 1:
    this.beatValueInTicks = Score.SEMIBREVE;
    break;
  case 2:
    this.beatValueInTicks = Score.MINIM;
    break;
  case 4:
    this.beatValueInTicks = Score.CROCHET;
    break;
  case 8:
    this.beatValueInTicks = Score.QUAVER;
    break;
  case 16:
    this.beatValueInTicks = Score.SEMIQUAVER;
    break;
  default:
    throw "Couldn't calulate ticks for beat value = "+beatValue;
  }
  if (this.beatsPerMeasure < 2 || this.beatsPerMeasure > 9)
    throw "Invalid beats per measure = "+beatsPerMeasure;
  this.ticksPerMeasure = this.beatsPerMeasure * this.beatValueInTicks;
};

Score.Meter.prototype = new Score.StaffElement();
Score.Meter.prototype.type = 'Meter';

Score.Meter.prototype.render = function(svg, xoffset, yoffset) {
  var top, bottom;
  top = Glyph.glyphs[this.beatsPerMeasure];
  bottom = Glyph.glyphs[this.beatValue];
  svg.path(top.d).move(xoffset, yoffset+1);
  svg.path(bottom.d).move(xoffset, yoffset + 2 * Score.Staff.LINE_HEIGHT);
  return xoffset + top.w + 15;
};
Score.Part = function() {
  this.measures = [];
  this.clef = 'treble';
};

Score.Part.prototype.unitNoteValue = function() {
  return this.score.unitNoteValue;
};

Score.Part.prototype.first = function() {
  return this.measures && this.measures[0].elements[0];
};

Score.Part.prototype.last = function() {
  return this.measures && this.measures[0].elements[0];
};

Score.Part.prototype.line = function(i) {
  var el;
  if (i == 0) {
    el = this.first();
  } else {
    el = this.findAll('Break')[i-1];
    el = el && el.next;
  }
  if (!el)
    return [];

  var line = [];
  while (el && el.type != 'Break') {
    line.push(el.measure);
    el = el.findNext(['Bar', 'Break']);
  }

  return line;
};

Score.Part.prototype.place = function(note) {
  return 31 - note.ord();
};

Score.Part.prototype.offsetToPitch = function(offset) {
  return Score.Note.ordToPitch(31-offset);
};

Score.Part.prototype.find = function(type) {
  var e = this.first();
  return e && e.findNext(type, {self: true});
};

Score.Part.prototype.findAll = function(type) {
  var results = [];
  for (var e = this.first(); e; e = e.next)
    if (e.isA(type))
      results.push(e);
  return results;
};

Score.Part.prototype.add = function(element) {
  var parent;
  if (this.chord) {
    parent = this.chord
  } else {
    var measure = this.measures[this.measures.length-1];
    if (!measure || element.isBar())
      measure = this.measures[this.measures.length] = new Score.Measure(this);
    parent = measure;
  }

  parent.push(element);
  element.part = this;
  element.score = this.score;

  if (this._lastAddedElement) {
    this._lastAddedElement.next = element;
    element.prev = this._lastAddedElement;
  }

  return this._lastAddedElement = element;
};

Score.Part.prototype.note = function(opts) {
  return this.add(new Score.Note(opts));
};
Score.Part.prototype.rest = function(opts) {
  return this.add(new Score.Rest(opts));
};
Score.Part.prototype.bar = function() {
  return this.add(new Score.Bar());
};
Score.Part.prototype.beginTuplet = function() {
  return this.add(new Score.TupletBegin());
};
Score.Part.prototype.endTuplet = function() {
  return this.add(new Score.TupletEnd());
};
Score.Part.prototype.beginSlur = function() {
  return this.add(new Score.SlurBegin());
};
Score.Part.prototype.endSlur = function() {
  return this.add(new Score.SlurEnd());
};
Score.Part.prototype.beginGrace = function() {
  return this.add(new Score.GraceBegin());
};
Score.Part.prototype.endGrace = function() {
  return this.add(new Score.GraceEnd());
};
Score.Part.prototype.beginChord = function() {
  var chord = this.add(new Score.Chord());
  this.chord = chord;
  return chord;
};
Score.Part.prototype.endChord = function() {
  this.chord = null;
};

Score.Part.prototype.renderClef = function(svg, yoffset) {
  var clef;
  switch(this.clef) {
  case 'treble':
    clef = Glyph.glyphs['clefs.G'];
    svg.path(clef.d).move(5, yoffset-13);
    break;
  case 'bass':
    clef = Glyph.glyphs['clefs.F'];
    svg.path(clef.d).move(5, yoffset);
    break;
  }
  return 35;
};

Score.Part.prototype.renderKey = function(svg, xoffset, yoffset) {
  var key = this.score.key.clone();
  key.part = this;
  return key.render(svg, xoffset, yoffset);
};

Score.Part.prototype.renderMeter = function(svg, xoffset, yoffset) {
  return this.score.meter.render(svg, xoffset, yoffset);
};

Score.Part.prototype.renderLines = function(svg, yoffset, w) {
  for (var i=0, y = yoffset; i < 5; ++i, y += Score.Staff.LINE_HEIGHT)
    svg.path('M0,'+y+' L'+w+','+y).stroke('#000');
};

Score.Part.prototype.above = function(e) {
  var mindex = this.measures.indexOf(e.measure);
  var vindex = this.score.parts.indexOf(this);
  var voiceAbove = this.score.parts[vindex-1];
  if (!voiceAbove)
    return null;

  var m2 = voiceAbove.measures[mindex];
  var eoffset = e.tickOffset(e.measure.elements[0]);
  var e2 = m2.elementAtOffset(eoffset);
  return e2;
};

Score.Part.prototype.below = function(e) {
  var mindex = this.measures.indexOf(e.measure);
  var vindex = this.score.parts.indexOf(this);
  var voiceAbove = this.score.parts[vindex+1];
  if (!voiceAbove)
    return null;

  var m2 = voiceAbove.measures[mindex];
  var eoffset = e.tickOffset(e.measure.elements[0]);
  var e2 = m2.elementAtOffset(eoffset);
  return e2;
};

Score.Part.prototype.render = function(svg, yoffset) {
  var xoffset;
  this.avatar = svg.group();
  this.renderLines(this.avatar, yoffset, svg.width());
  xoffset = this.renderClef(this.avatar, yoffset);
  xoffset = this.renderKey(this.avatar, xoffset, yoffset);
  xoffset = this.renderMeter(this.avatar, xoffset, yoffset);
  return xoffset + 15;
};

Score.Part.prototype.toABC = function(measures) {
  var abc = "[V: "+this.id+"\t] ";
  for (var i=0; i < measures.length; ++i) {
    for (var j=0; j < measures[i].elements.length; ++j) {
      abc += measures[i].elements[j].toABC();
    }
  }
  return abc + "\n";
};

Score.Part.renderAll = function(svg, voices, yoffset) {
  var nvoices = voices.length;
  var nmeasures = voices[0][1].length;
  var staffHeight = Score.Staff.HEIGHT;
  var staffPadding = Score.Staff.VERTICAL_PADDING;

  var y0 = yoffset;
  var y1 = y0+nvoices*(staffHeight+staffPadding)-staffPadding;
  var xoffset = 0;

  for (var x, i=0; i < nvoices; ++i) {
    x = voices[i][0].render(svg, yoffset + i*(staffHeight+staffPadding));
    xoffset = Math.max(xoffset, x);
  }
  svg.line(0, y0, 0, y1).stroke({ width: 2.5, color: '#000' });

  for (var measure, i=0; i < nvoices; ++i) {
    for (var j=0; j < voices[i][1].length; ++j) {
      measure = voices[i][1][j];
      measure.renderXOffset = xoffset;
      measure.prerender(svg, yoffset+i*(staffHeight+staffPadding));
    }
  }

  var set = [];
  for (var i=0; i < nvoices; ++i)
    set.push($.map(voices[i][1], function(x){ return x.elements }));

  new Score.Formatter(set, svg.width()-xoffset).format(xoffset);

  for (var i=0; i < nvoices; ++i)
    for (var j=0; j < voices[i][1].length; ++j)
      voices[i][1][j].render(svg);

  for (var i=0; i < nvoices; ++i)
    for (var j=0; j < voices[i][1].length; ++j)
      voices[i][1][j].renderBeams(svg);

  return yoffset + nvoices * (staffHeight + staffPadding);
};
Score.Staff = {};

// Picked right for Glyph.glyphs
Score.Staff.LINE_HEIGHT = 8;
Score.Staff.HEIGHT = 4 * Score.Staff.LINE_HEIGHT,

// Amount of padding (available for ledgers)
Score.Staff.VERTICAL_PADDING = 64;
Score.Bar = function() {
};
Score.Bar.prototype = new Score.StaffElement();
Score.Bar.prototype.type = 'Bar';

Score.Bar.prototype.toABC = function() {
  return ' | ';
};

Score.Bar.prototype.render = function(svg, x, y) {
  this.avatar = svg.line(x, y, x, y+Score.Staff.HEIGHT).stroke('#000');
};

Score.Chord = function() {
  this.notes = [];
};

Score.Chord.prototype = new Score.Tickable();
Score.Chord.prototype.type = 'Chord';

Score.Chord.prototype.push = function(note) {
  note.measure = this.measure;
  note.chord = this;
  this.notes.push(note);
};

Score.Chord.prototype.ticks = function() {
  return this.notes[0].ticks();
};

Score.Chord.prototype.render = function(svg, x, y) {
  this.avatar = svg.group();

  var seconds = {};
  var notes = this.notes.slice(0);
  notes.sort(function(n1, n2) { return n1.ord(true) - n2.ord(true); });
  for (var i=1; i < notes.length; ++i)
    if (notes[i].ord(true) - notes[i-1].ord(true) <= 2)
      seconds[notes[i].opts.pitch] = seconds[notes[i-1].opts.pitch] = true;

  var toggle = false;
  var accidentals = [];
  for (var right, i = notes.length-1; i >= 0; --i) {
    toggle = seconds[notes[i].opts.pitch] ? !toggle : toggle;
    notes[i].render(this.avatar, x, y, {
      right: toggle,
      accidentals: accidentals
    });
  }
};

Score.Chord.prototype.toABC = function() {
  var abc = '[';
  for (var i=0; i < this.notes.length; ++i)
    abc += this.notes[i].toABC();
  abc += ']';
  return abc;
};
Score.GraceBegin = function(){}
Score.GraceBegin.prototype = new Score.StaffElement();
Score.GraceBegin.prototype.type = 'GraceBegin';

Score.GraceEnd = function(){}
Score.GraceEnd.prototype = new Score.StaffElement();
Score.GraceEnd.prototype.type = 'GraceEnd';
Score.SlurBegin = function(){};
Score.SlurBegin.prototype = new Score.StaffElement();
Score.SlurBegin.prototype.type = 'SlurBegin';

Score.SlurEnd = function(){}
Score.SlurEnd.prototype = new Score.StaffElement();
Score.SlurEnd.prototype.type = 'SlurEnd';
Score.TupletBegin = function(){};
Score.TupletBegin.prototype = new Score.StaffElement();
Score.TupletBegin.prototype.type = 'TupletBegin';

Score.TupletEnd = function(){};
Score.TupletEnd.prototype = new Score.StaffElement();
Score.TupletEnd.prototype.type = 'TupletEnd';
Score.Note = function(opts) {
  this.opts = opts;
  this.opts.accidentals = this.opts.accidentals || '';
};
Score.Note.prototype = new Score.Tickable();
Score.Note.prototype.type = 'Note';

// Populated on demand
Score.Note.ORDINALS = {};
Score.Note.CHROMATIC_ORDINALS = {};
Score.Note.PITCHES = {};

Score.Note.prototype.ord = function(chromatic) {
  var pitch = this.opts.accidentals + this.opts.pitch;
  return Score.Note.pitchToOrd(pitch, chromatic);
};

Score.Note.pitchToOrd = function(pitch, chromatic) {
  var cache = chromatic ? this.ORDINALS : this.CHROMATIC_ORDINALS;
  if (cache[pitch])
    return cache[pitch];

  var mdata, shift = 0;
  var octshift = chromatic ? 12 : 7;
  var note = pitch.match(/([A-Ga-g][,']*)/)[1];
  while((mdata = note.match(/[,']/))) {
    note = note.replace(/[,']/, '');
    shift += (mdata[0] == ',') ? -octshift : octshift;
  }

  if (chromatic && pitch.indexOf('^') != -1)
    shift += 1;
  else if (chromatic && pitch.indexOf('_') != -1)
    shift -= 1;

  var key = note.match(/[A-Ga-g]/);
  var bases;
  if (chromatic)
    bases = {
      'C': 60, 'D': 62, 'E': 64, 'F': 65, 'G': 67, 'A': 69, 'B': 71,
      'c': 72, 'd': 74, 'e': 76, 'f': 77, 'g': 79, 'a': 81, 'b': 83
    };
  else
    bases = {
      'C': 21, 'D': 22, 'E': 23, 'F': 24, 'G': 25, 'A': 26, 'B': 27,
      'c': 28, 'd': 29, 'e': 30, 'f': 31, 'g': 32, 'a': 33, 'b': 34
    };

  cache[pitch] = bases[key] + shift;
  return bases[key] + shift;
};

Score.Note.ordToPitch = function(ord) {
  // Note: there's no chromatic version of this method
  if (this.PITCHES[ord])
    return this.PITCHES[ord];

  var shift = '';
  var normalizedOrd = ord;
  while (normalizedOrd < 21) {
    shift += ",";
    normalizedOrd += 7;
  }
  while (normalizedOrd > 34) {
    shift += "'";
    normalizedOrd -= 7;
  }
  var bases = {
    21: 'C', 22: 'D', 23: 'E', 24: 'F', 25: 'G', 26: 'A', 27: 'B',
    28: 'c', 29: 'd', 30: 'e', 31: 'f', 32: 'g', 33: 'a', 34: 'b'
  };

  this.PITCHES[ord] = bases[normalizedOrd] + shift;
  return bases[normalizedOrd] + shift;
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

  var next = this.findPrev(['Note', 'Rest']);
  return next && next.opts.beam;
};

Score.Note.prototype.isBeamStart = function(strict) {
  var next = this.findNext(['Note', 'Rest'], {neighbor: true});
  var beamed = this.opts.beam && next && next.type == 'Note';
  if (strict) {
    var prev = this.findPrev(['Note', 'Rest'], {neighbor: true});
    return beamed && (!prev || !prev.opts.beam);
  }
  return beamed;
};

Score.Note.prototype.beamNext = function() {
  if (!this.opts.beam)
    return null;
  var next = this.findNext(['Note', 'Rest'], {neighbor: true});
  return next && next.type == 'Note' && next;
};

Score.Note.prototype.beamEnd = function() {
  if (!this.opts.beam)
    return this;
  var next = this.findNext(['Note', 'Rest'], {neighbor: true});
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

Score.Note.prototype.motion = function(note) {
  var myOrd = this.ord(true);
  var itsOrd = note.ord(true);
  if (myOrd < itsOrd)
    return 'ascending';
  if (itsOrd < myOrd)
    return 'descending';
  return 'none';
};

Score.Note.prototype.interval = function(note) {
  var myOrd = this.ord(true);
  var itsOrd = note.ord(true);

  var semitones;
  if (myOrd < itsOrd)
    semitones = itsOrd - myOrd;
  else
    semitones = myOrd - itsOrd;

  var interval = {
    notes: (myOrd < itsOrd) ? [this, note] : [note, this],
    semitones: semitones,
    perfect: false, consonant: false
  };

  while (semitones > 12)
    semitones -= 12;
  interval.normalizedSemitones = semitones;

  switch(semitones) {
  case 0:
    interval.name ='P1';
    interval.consonant = true;
    interval.perfect = true;
    break;
  case 1:
  case 2:
    interval.name ='2';
    break;
  case 3:
  case 4:
    interval.name ='3';
    interval.consonant = true;
    break;
  case 5:
    interval.name ='P4';
    interval.perfect = true;
    break;
  case 6:
    interval.name ='Tri';
    interval.tritone = true;
    break;
  case 7:
    interval.name ='P5';
    interval.consonant = true;
    interval.perfect = true;
    break;
  case 8:
  case 9:
    interval.name ='6';
    interval.consonant = true;
    break;
  case 10:
    interval.name ='7';
    break;
  case 11:
    interval.name ='7+';
    break;
  case 12:
    interval.name ='P8';
    interval.consonant = true;
    interval.perfect = true;
    break;
  }

  return interval;
};

Score.Note.prototype.render = function(svg, x, y, options) {
  var position = this.part.place(this);
  y = y + position * Score.Staff.LINE_HEIGHT / 2;

  options = options || {};

  var ball = Glyph.Note.render(svg, this.glyphValue(), {
    sharp: this.isSharp(),
    noflags: this.isBeamed(),
    ledger: (position < 0 || position > 8) ? (position % 2) : undefined,
    right: options.right,
    accidentals: options.accidentals,
    dot: this.isDotted()
  });

  ball.move(x+Score.Staff.LINE_HEIGHT/2, y,
            Score.Staff.LINE_HEIGHT/2);

  // For receiving events inside the note head
  var box = ball.head.bbox();
  ball.rect(box.width+3, box.height+3).move(box.x-1.5, box.y-1.5).opacity(0.0);

  this.avatar = ball;
  this.bindListeners();
};
Score.Rest = function(opts) {
  this.opts = opts;
};
Score.Rest.prototype = new Score.Tickable();
Score.Rest.prototype.type = 'Rest';

Score.Rest.prototype.glyphValue = Score.Note.prototype.glyphValue;

Score.Rest.prototype.render = function(svg, x, y) {
  var rest = Glyph.Rest.render(svg, this.glyphValue());
  var box = rest.bbox();
  switch(this.glyphValue()) {
  case 'whole':
    rest.move(x + box.width/2, y + Score.Staff.LINE_HEIGHT);
    break;
  case 'half':
    rest.move(x + box.width/2, y + 2*Score.Staff.LINE_HEIGHT - box.height);
    break;
  default:
    rest.move(x + box.width/2, y + 2*Score.Staff.LINE_HEIGHT - box.height/2);
  }

  this.avatar = rest;
  this.bindListeners();
};

Score.Chord = function() {
  this.notes = [];
};

Score.Chord.prototype = new Score.Tickable();
Score.Chord.prototype.type = 'Chord';

Score.Chord.prototype.push = function(note) {
  note.measure = this.measure;
  note.chord = this;
  this.notes.push(note);
};

Score.Chord.prototype.ticks = function() {
  return this.notes[0].ticks();
};

Score.Chord.prototype.render = function(svg, x, y) {
  this.avatar = svg.group();

  var seconds = {};
  var notes = this.notes.slice(0);
  notes.sort(function(n1, n2) { return n1.ord(true) - n2.ord(true); });
  for (var i=1; i < notes.length; ++i)
    if (notes[i].ord(true) - notes[i-1].ord(true) <= 2)
      seconds[notes[i].opts.pitch] = seconds[notes[i-1].opts.pitch] = true;

  var toggle = false;
  var accidentals = [];
  for (var right, i = notes.length-1; i >= 0; --i) {
    toggle = seconds[notes[i].opts.pitch] ? !toggle : toggle;
    notes[i].render(this.avatar, x, y, {
      right: toggle,
      accidentals: accidentals
    });
  }
};

Score.Chord.prototype.toABC = function() {
  var abc = '[';
  for (var i=0; i < this.notes.length; ++i)
    abc += this.notes[i].toABC();
  abc += ']';
  return abc;
};

// see http://www.sonicspot.com/guide/midifiles.html

function toHex(num, length) {
  if (length === undefined)
    return toVariableLengthHex(num);
  var hex = num.toString(16);
  while (hex.length < length)
    hex = '0' + hex;
  return hex;
}

function toVariableLengthHex(num) {
  var a = [];
  while (num) {
    a.push(num & 0x7F)
    num = num >> 7;
  }

  var x = 0;
  for (var i = a.length-1; i >= 0; --i) {
    x = x << 8;
    if (i != 0)
      a[i] = a[i] | 0x80;
    x = x | a[i];
  }

  var padding = x.toString(16).length;
  padding += padding % 2;

  return toHex(x, padding);
}

Score.MidiWriter = function(model) {
  this.data = '';
  this.model = model;
};

Score.MidiWriter.prototype.writeData = function(data) {
  this.data += data;
};

Score.MidiWriter.prototype.writeHeader = function() {
  this.writeData('4D546864'); // "MThd"
  this.writeData('00000006');
  this.writeData('0001'); // midi type 1 (multiple tracks)
  this.writeData(toHex(this.model.parts.length, 4)); // number of tracks
  this.writeData('7800'); // Score.CROCHET ticks per quarter note
};

Score.MidiWriter.prototype.ticksToMs = function(t, tempo) {
  var tPerBeat = Score.CROCHET; // ticks per beat, see writeHeader
  tempo = tempo || 120; // default. 120 crochets / sec
  return 1000 * (t / tPerBeat) * (60 / tempo);
};

Score.MidiWriter.prototype.trackChunk = function(writer) {
  this.writeData('4D54726B'); // "MTrk"

  var eventData = '';
  writer.call(this, {
    writeData: function(data) {
      eventData += data;
    },
    tempo: function(bpm) {
      var usPerBeat = Math.round(60000000 / bpm);
      this.writeData('00ff5103'+toHex(usPerBeat, 6));
    },
    noteOn: function(delta, ord) {
      this.writeData(toHex(delta)); // delta time
      this.writeData('91'); // note on, channel 1
      this.writeData(toHex(ord, 2)); // note number
      this.writeData('7f'); // velocity (127)
    },
    noteOff: function(delta, ord) {
      this.writeData(toHex(delta)); // note length
      this.writeData('81'); // note off, channel 1
      this.writeData(toHex(ord, 2)); // note number
      this.writeData('7f'); // velocity
    }
  });

  this.writeData(toHex(eventData.length/2, 8));
  this.writeData(eventData);
};

Score.MidiWriter.prototype.writeTrack = function(part) {
  var events = {};
  var midi = this;
  var bpm = part.score.tempo.bpm('1/4');
  var event = function(t, e, d) {
    t = midi.ticksToMs(t, bpm);
    d = midi.ticksToMs(d, bpm);
    events[t] = events[t] || {t: t, on: [], off: []};
    events[t+d] = events[t+d] || {t: t+d, on: [], off: []};
    events[t].on.push(e);
    events[t+d].off.push(e);
  };

  this.trackChunk(function(track) {
    var e = part.find(['Note', 'Rest', 'Chord']);
    var t = 0;
    var delta = 0;
    track.tempo(bpm);
    while (e) {
      if (!e.chord) {
        if (e.type == 'Rest') {
          delta += e.ticks();
          event(t, e, e.ticks());
        } else if (e.type == 'Chord') {
          e.notes.forEach(function(note, inote) {
            track.noteOn(inote == 0 ? delta : 0, note.ord(true));
            event(t, note, note.ticks());
          });
          e.notes.forEach(function(note, inote) {
            track.noteOff(inote == 0 ? e.ticks() : 0, note.ord(true));
          });
          delta = 0;
        } else if (e.type == 'Note') {
          track.noteOn(delta, e.ord(true));
          track.noteOff(e.ticks(), e.ord(true));
          event(t, e, e.ticks());
          delta = 0;
        }
        t += e.ticks();
      }
      e = e.findNext(['Note', 'Rest', 'Chord']);
    }

    // Silent 0-length note to finish the track
    track.writeData(toHex(delta)); // delta time
    track.writeData('91'); // note on, channel 1
    track.writeData(toHex(60, 2)); // note number
    track.writeData('00'); // velocity (127)

    track.writeData('00ff2f00'); // end of track
  });

  return events;
};

Score.MidiWriter.prototype.writeMidi = function() {
  this.writeHeader();

  var allEvents = {};
  for (var e, i=0; i < this.model.parts.length; ++i) {
    e = this.writeTrack(this.model.parts[i]);
    for (var t in e) {
      if (allEvents[t]) {
        allEvents[t].on = allEvents[t].on.concat(e[t].on);
        allEvents[t].off = allEvents[t].off.concat(e[t].off);
      } else {
        allEvents[t] = e[t];
      }
    }
  }

  var events = [];
  for (var e in allEvents)
    events.push(allEvents[e]);
  events.sort(function(x,y) { return x.t - y.t });

  var encoded = '';
  for (var i=0; i < this.data.length; i += 2)
    encoded += '%'+this.data.substr(i, 2).toUpperCase();

  var binary = '';
  while (encoded.length) {
    if (encoded[0] == '%') {
      hex = parseInt(encoded.substr(1, 2), 16);
      binary += String.fromCharCode(hex);
      encoded = encoded.substr(3);
    }  else {
      binary += encoded[0];
      encoded = encoded.substr(1);
    }
  }


  return {file: 'data:audio/midi;base64,'+btoa(binary), events: events};
};

function ABCLineParser(source) {
  this.source = source;
  this.consumeDecorations();
}

ABCLineParser.prototype = {
  throw_if: function(value, message) {
    var col = 0;
    if (this.results[this.results.length-1])
      col = this.results[this.results.length-1].col + 1;
    if (value) {
      message = '('+col+'): '+message+"\n"+this.original_source;
      message += "\n";
      for (var i=0; i < col; ++i)
        message += ' ';
      message += '^';
      throw message;
    }
  },

  lookAhead: function() {
    this.source = this.source.replace(/^\s+/, '');
    return this.source[0];
  },

  consumeAccidentals: function() {
    var acc = this.accidentals || null;
    this.accidentals = null;
    return acc;
  },

  consumeDecorations: function() {
    var dec = this.decorations || {};
    this.decorations = {};
    return dec;
  },

  parseNoteValue: function() {
    // TODO broken rhythm
    // TODO tuplets
    // TODO error checking on the value (e.g. what would /9 mean?)
    var m = this.source.match(/^[1-9]?\/?[1-9]/);
    if (m)
      this.source = this.source.substr(m[0].length);
    return m ? m[0] : '1';
  },

  beginSlur: function() {
    this.slur = (this.slur || 0) + 1;
  },

  endSlur: function() {
    this.slur = (this.slur || 0) - 1;
    this.throw_if(this.slur < 0, 'Slur begin / end mismatch');
  },

  beginGrace: function() {
    this.throw_if(this.grace, 'Grace note brackets cannot be nested');
    this.grace = true;
  },

  endGrace: function() {
    this.throw_if(!this.grace, 'Grace note begin / end mismatch');
    this.grace = false;
  },

  beginChord: function() {
    this.throw_if(this.chord, 'Chord brackets cannot be nested');
    this.chord = true;
  },

  endChord: function() {
    this.throw_if(!this.chord, 'Chord begin / end mismatch');
    this.chord = false;
  },

  parse: function() {
    var unit, prev = null;
    var types = [].slice.call(arguments);

    var begin = 0;
    var src = this.source;
    this.original_source = src;
    this.results = [];
    while (this.source.match(/\S/)) {
      begin += this.source.match(/^\s*/)[0].length;
      this.source = this.source.replace(/^\s+/, '');

      unit = this.parseUnit();
      unit.col = begin;
      unit.source = src.substr(begin, src.length-this.source.length-begin);
      begin += unit.source.length;

      if (prev)
        prev.next = unit;
      unit.prev = prev;
      prev = unit;

      this.results.push(unit);
    }

    var results = [];
    for (var i=0; i < this.results.length; ++i)
      if (!types.length || types.indexOf(this.results[i].type) != -1)
        results.push(this.results[i]);
    return results;
  },

  parseUnit: function() {
    var token, shift, swing, beam, value, tie, accidental, decorations;
    token = this.lookAhead();

    switch(token.toLowerCase()) {
    case 'a':
    case 'b':
    case 'c':
    case 'd':
    case 'e':
    case 'f':
    case 'g':
      accidental = this.consumeAccidentals();
      decorations = this.consumeDecorations();
      token = this.source.match(/^[A-Ga-g]('|,)*/)[0];
      this.source = this.source.substr(token.length);

      value = this.parseNoteValue();

      beam = this.source.match(/^\S/);
      beam = beam && !this.chord && !this.source.match(/^\)\s/);
      this.source = this.source.replace(/^\s+/, '');

      swing = this.source.match(/^[><]/);
      swing = swing && swing[0];
      this.source = this.source.replace(/^[><]/, '');

      tie = !!this.source.match(/^-/);
      this.source = this.source.replace(/^-/, '');

      return {
        type: 'note',
        pitch: token,
        value: value,
        accidentals: accidental || '',
        decorations: decorations,
        swing: swing,
        tie: tie,
        beam: beam,

        computedSource: function() {
          var src = '';
          for (var key in this.decorations)
            src += this.decorations[key];

          src += this.accidentals;

          src += this.pitch;
          src += (this.value == '1' ? '' : this.value);

          if (this.swing)
            src += this.swing;
          if (!this.beam)
            src += ' ';
          if (this.tie)
            src += '-';

          return src;
        }
      };

    case '^':
    case '_':
    case '=':
      this.source = this.source.replace(/^./, '');
      this.accidentals = (this.accidentals || '') + token;
      return this.parseUnit();

    case '.':
    case '~':
    case 'h':
    case 'l':
    case 'm':
    case 'p':
    case 't':
    case 'u':
    case 'v':
      // TODO support !trill! notation
      this.source = this.source.replace(/^./, '');
      this.decorations[
        {
          '.': 'staccato', '~': 'roll', 'h': 'fermata',
          'l': 'accent', 'm': 'lower_mordent', 'p': 'upper_mordent',
          't': 'trill', 'u': 'up_bow', 'v': 'down_bow'
        }[token.toLowerCase()]
      ] = token;
      return this.parseUnit();

    case 'z':
    case 'x':
      // TODO support multi-measure rests
      // TODO accidental check should also check decorations
      accidental = this.consumeAccidentals();
      this.throw_if(accidental, 'Rests cannot be preceded by an accidental');

      this.source = this.source.replace(/^./, '');
      value = this.parseNoteValue();

      return {
        type: 'rest',
        value: value
      };

    case '|':
      accidental = this.consumeAccidentals();
      this.throw_if(accidental,
                    'Bar lines cannot be preceded by an accidental');

      this.source = this.source.replace(/^./, '');

      if (this.source[0] == ':') {
        this.source = this.source.replace(/^./, '');
        return { type: 'repeat_begin', bar: true };
      } else if (this.source.match(/^(\d)|(\s*\[\d)/)) {
        this.source = this.source.replace(/^(\d)|(\s*\[\d)/, '');
        return { type: 'nth_ending_begin', bar: true };
      } else {
        if (this.source[0] == ']')
          this.source = this.source.substr(1);
        return { type: 'bar', bar: true };
      }

    case ':':
      accidental = this.consumeAccidentals();
      this.throw_if(accidental,
                    'Bar lines cannot be preceded by an accidental');

      this.source = this.source.replace(/^./, '');

      if (this.source[0] == '|') {
        this.source = this.source.replace(/^./, '');
        if (this.source.match(/^(\d)|(\s*\[\d)/)) {
          this.source = this.source.replace(/^(\d)|(\s*\[\d)/, '');
          return { type: 'nth_ending_begin', bar: true };
        } else {
          return { type: 'repeat_end', bar: true };
        }
      } else {
        this.throw_if(true, 'Expectedd pipe (|) after colon');
      }

    case '(':
      accidental = this.consumeAccidentals();
      this.source = this.source.replace(/^./, '');

      if (this.source.match(/^\d/)) {
        value = parseInt(this.source.match(/^\d/)[0]);
        this.source = this.source.replace(/^\d/, '');

        this.throw_if(accidental,
                      'Tuplet cannot be preceded by an accidental');

        return { type: 'tuplet_begin', value: value };
      } else {
        this.throw_if(accidental,
                      'Slur cannot be preceded by an accidental');

        this.beginSlur();

        return { type: 'slur_begin' };
      }

    case ')':
      accidental = this.consumeAccidentals();
      this.source = this.source.replace(/^./, '');

      this.throw_if(accidental,
                    'Slur ends cannot be preceded by an accidental');

      this.endSlur();

      return { type: 'slur_end' };

    case '{':
      accidental = this.consumeAccidentals();
      this.source = this.source.replace(/^./, '');

      this.throw_if(accidental, 'Grace note bracket preceded by accidental');

      this.beginGrace();

      return { type: 'grace_begin' };

    case '}':
      accidental = this.consumeAccidentals();
      this.source = this.source.replace(/^./, '');

      this.throw_if(accidental, 'Grace note bracket preceded by accidental');

      this.endGrace();

      return { type: 'grace_end' };

    case '[':
      // TODO beamed/tied chords?
      // NOTE chord decorations are attached to its first note
      accidental = this.consumeAccidentals();
      this.source = this.source.replace(/^./, '');

      this.throw_if(accidental, 'Chord bracket preceded by accidental');

      this.beginChord();

      return { type: 'chord_begin' };

    case ']':
      accidental = this.consumeAccidentals();
      this.source = this.source.replace(/^./, '');

      this.throw_if(accidental, 'Chord bracket preceded by accidental');

      this.endChord();

      return { type: 'chord_end' };

    case '"':
      this.source = this.source.substr(1);
      this.throw_if(!(this.source[0] || '').match(/[_<>^]/),
                    "Expected one of _<>^ after annotation quote");

      value = this.source.match(/[_<>^][^"]+"/)
      this.throw_if(!value, "Invalid annotation string");
      this.source = this.source.substr(value[0].length);

      return { type: 'annotation', value: value[0] };

    default:
      this.throw_if(true, 'Unexpected token: '+token);
    }
  }
};
Gradus.Constraints = function() {
  this.violations = [];
};
Gradus.Constraints.Violation = function(message) {
  this.message = message;
  this.elements = Array.prototype.slice.call(arguments, 1);
};

Gradus.Constraints.prototype.check = function(score) {
  var counterpoint = score.parts[0];

  var chords = [];
  counterpoint.findAll('Chord').forEach(function(chord) {
    var rest = new Score.Rest({ value: chord.notes[0].opts.value });
    chord.measure.replace(chord, rest, false);
    chord._rest = rest;
    chords.push(chord);

  });

  var violations = [];
  for (var error, i=0; i < this.rules.length; ++i) {
    if ((error = this.rules[i].call(this, score)))
      violations.push(error);
  }

  if (chords.length)
    chords.forEach(function(chord) {
      chord.measure.replace(chord._rest, chord, false);
    });

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
      note.avatar && note.avatar.fill('#000');
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

Gradus.Constraints.prototype.adjacentCounterpointNotes = function(score) {
  var counterpoint = score.parts[0];

  var prev = counterpoint.find('Note');
  var curr = prev && prev.findNext(['Note', 'Rest']);

  if (!prev)
    return [];

  var pairs = [];
  while (curr) {
    if (prev.type == 'Note' && curr.type == 'Note')
      pairs.push([prev, curr]);
    prev = curr;
    curr = curr.findNext(['Note', 'Rest']);
  }

  return pairs;
};

var Violation = Gradus.Constraints.Violation;
Gradus.FirstSpecies = new Gradus.Constraints();

// Return a first guess at which notes could go on top of
// a cf, in place of a rest
Gradus.FirstSpecies.naiveSonorities = function(bass, rest, prev) {
  var notes = [];
  var bassOrd = bass.ord();

  var offsets = [-9, -7, -5, -4, -2, 0, 2, 4, 5, 7, 9];
  for (var i=0; i < offsets.length; ++i) {
    notes.push(
      new Score.Note({
        pitch: Score.Note.ordToPitch(bassOrd+offsets[i]),
        value: rest.opts.value
      })
    );

    // Short-cut, remove it if makes a tritone
    if (bass.interval(notes[notes.length-1]).tritone)
      notes.pop();

  }

  if (prev) {
    // Short-cut the check for travel by tritone or >= major sixth
    for (var interval, i=0; i < notes.length; ++i) {
      interval = prev.interval(notes[i]).semitones;
      if (interval == 6 || interval >= 9)
        notes.splice(i--, 1);
    }
  }

  return notes;
};

Gradus.FirstSpecies.rules = [
  // Must contain only consonances
  function(score) {
    var cf = score.part('Cantus Firmus');
    var notes = cf.findAll('Note');
    for (var note, i=0; i < notes.length; ++i) {
      note = notes[i];
      var counterpoint = cf.above(note);
      if (counterpoint.type != 'Note')
        continue;
      var interval = note.interval(counterpoint);
      if (!interval.consonant)
        return new Violation('All intervals must be consonant', counterpoint);
    }
  },

  // Must start with and end with perfect consonance
  function(score) {
    var cf = score.part('Cantus Firmus');
    var notes = cf.findAll('Note');

    var first = notes.shift();
    var counterpoint = cf.above(first);
    if (counterpoint.type != 'Note')
      return;
    var interval = first.interval(counterpoint);
    if (!(interval.perfect && interval.consonant))
      return new Violation('Must start with a perfect consonance', counterpoint);

    var last = notes.pop();
    counterpoint = cf.above(last);
    if (counterpoint.type != 'Note')
      return;
    interval = last.interval(counterpoint);
    if (!(interval.perfect && interval.consonant))
      return new Violation('Must end with a perfect consonance', counterpoint);
  },

  // Must not be unison anywhere else
  function(score) {
    var cf = score.part('Cantus Firmus');
    var notes = cf.findAll('Note');

    notes.shift();
    notes.pop();

    for (var note, i=0; i < notes.length; ++i) {
      note = notes[i];
      var counterpoint = cf.above(note);
      if (counterpoint.type != 'Note')
        continue;
      var interval = note.interval(counterpoint);
      if (interval.semitones == 0)
	return new Violation("Must not be unison except on first and last notes",
                            counterpoint);
    }
  },

  // Must establish mode clearly at the start
  // "we start on the tonic and should reinforce the tonic"
  function() { },

  // Must not travel by tritone
  function(score) {
    var pairs = this.adjacentCounterpointNotes(score);
    for (var interval, i=0; i < pairs.length; ++i) {
      interval = pairs[i][0].interval(pairs[i][1]);
      if (interval.tritone)
        return new Violation('Must not travel by tritone', pairs[i][0], pairs[i][1]);
    }
  },

  // Must not travel by more than a minor sixth
  function(score) {
    var pairs = this.adjacentCounterpointNotes(score);
    for (var interval, i=0; i < pairs.length; ++i) {
      interval = pairs[i][0].interval(pairs[i][1]);
      if (interval.semitones >= 9)
        return new Violation('Must not travel by more than a minor sixth',
                             pairs[i][0], pairs[i][1]);
    }
  },

  // Must not move by parallel motion into perfect consonance
  function(score) {
    var cf = score.part('Cantus Firmus');
    var counterpoint = score.parts[0];
    var intervals = intervalSequence(cf, counterpoint);
    for (var i=0; i < intervals.length; ++i) {
      if (intervals[i].motion != 'parallel')
        continue;
      if (intervals[i].destination.perfect && intervals[i].destination.consonant)
        return new Violation('Parallel motion must not result in a perfect consonance',
                            intervals[i].notes[1], intervals[i].destination.notes[1]);
    }
  },

  // Total range must not exceed a tenth
  function(score) {
    var counterpoint = score.parts[0];
    var notes = counterpoint.findAll('Note');
    if (!notes.length)
      return;

    var low, high, lowOrd, highOrd;
    low = high = notes[0];
    lowOrd = highOrd = notes[0].ord(true);
    for (var ord, i=1; i < notes.length; ++i) {
      ord = notes[i].ord(true);
      if (ord < lowOrd) {
        lowOrd = ord;
        low = notes[i];
      } else if (ord > highOrd) {
        highOrd = ord;
        high = notes[i];
      }
    }

    if (16 < highOrd - lowOrd)
      return new Violation('Total range of voice must not exceed a tenth', low, high);
  },


  // Should not battuta (contract from 10th to 8ve stepwise)
  function() { },

  // Should not leap to an octave consonance from a more "remote" consonance
  function() { },

  // Should not travel stepwise for a total of a tritone
  function() { },

  // Second to last note MUST be a major sixth (?)
  function(score) {
    var cf = score.part('Cantus Firmus');
    var counterpoint = score.parts[0];
    var note, notes = cf.findAll('Note');
    note = notes[notes.length-2];

    var above = cf.above(note);
    if (!above || above.type != 'Note')
      return;

    var semitones = note.interval(above).normalizedSemitones;
    if (note.ord(true) < above.ord(true)) {
      if (semitones != 9 && semitones != 8) // alow minor 6th just for now
        return new Violation('Second to last note must create a major 6th', above);
    } else {
      if (note.interval(above).normalizedSemitones != 3)
        return new Violation('Second to last note must create a minor 3rd', above);
    }
  }
];


function intervalSequence(bass, counterpoint) {
  var above, below;
  above = counterpoint.find(['Note', 'Rest']);

  var events = [];
  while (above) {
    below = above.measure.part.below(above);
    if (above.type == 'Note' && below.type == 'Note')
      events.push([below, above]);
    above = above.findNext(['Note', 'Rest']);
  }

  for (var n1, n2, i=0; i < events.length; ++i) {
    n1 = events[i][0].findNext(['Note', 'Rest']);
    n2 = events[i][1].findNext(['Note', 'Rest']);
    if (!n1 || !n2 || (n1.type != 'Note') || (n2.type != 'Note'))
      events.splice(i--, 1);
    else
      events[i] = [[events[i][0], n1], [events[i][1], n2]];
  }

  var intervals = [];
  for (var interval, n1, n2, m1, m2, i=0; i < events.length; ++i) {
    below = events[i][0][0];
    above = events[i][1][0];
    n1 = events[i][0][1];
    n2 = events[i][1][1];
    m1 = below.motion(n1);
    m2 = above.motion(n2);
    interval = below.interval(above);
    interval.destination = n1.interval(n2);
    if (m1 == m2)
      interval.motion = 'parallel';
    else if (m1 != 'none' && m2 != 'none')
      interval.motion = 'contrary';
    else
      interval.motion = 'oblique';
    intervals.push(interval);
  }

  return intervals;
};

var input = process.argv[2];
if (!input) {
  console.error("Usage: node solve.1st.js filename");
  process.exit(1);
}

var fs = require('fs');
var abc = fs.readFileSync(input).toString();

var score = Score.parseABC(abc);
var futures = Gradus.FirstSpecies.elaborate(score);

console.log("cf = CantusFirmus.first")
futures.forEach(function(future) {
  futures = futures.map(function(x) { return x + '4' });
  console.log('cf.counterpoints.create(:abc => "'+future.join('|')+'")')
});

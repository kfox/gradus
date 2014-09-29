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
  return key ? key.render(svg, xoffset, yoffset) : xoffset;
};

Score.Part.prototype.renderMeter = function(svg, xoffset, yoffset) {
  var meter = this.meterWasRendered ? false : this.score.meter;
  this.meterWasRendered = true;
  return meter ? meter.render(svg, xoffset, yoffset) : xoffset;
};

Score.Part.prototype.renderLines = function(svg, yoffset) {
  var w = svg.width();
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
  this.renderLines(svg, yoffset);
  xoffset = this.renderClef(svg, yoffset);
  xoffset = this.renderKey(svg, xoffset, yoffset);
  xoffset = this.renderMeter(svg, xoffset, yoffset);
  return xoffset;
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
  new Score.Formatter(set).format(xoffset);

  for (var i=0; i < nvoices; ++i)
    for (var j=0; j < voices[i][1].length; ++j)
      voices[i][1][j].renderBeams(svg);

  return yoffset + nvoices * (staffHeight + staffPadding);
};

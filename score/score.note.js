Score.Note = function(opts) {
  this.pitch = opts.pitch || 'C';
  this.accidentals = opts.accidentals || '';
  this.value = opts.value || '1';
  this.swing = opts.swing;
  this.beam = opts.beam;
  this.tie = opts.tie;
};
Score.Note.prototype = new Score.Tickable();
Score.Note.prototype.type = 'Note';

// Populated on demand
Score.Note.ORDINALS = {};
Score.Note.CHROMATIC_ORDINALS = {};
Score.Note.PITCHES = {};
Score.Note.CHROMATIC_PITCHES = {};

Score.Note.prototype.ord = function(chromatic) {
  var pitch = this.accidentals + this.pitch;
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

Score.Note.ordToPitch = function(ord, chromatic) {
  var cache = chromatic ? this.PITCHES : this.CHROMATIC_PITCHES;
  if (cache[ord])
    return cache[ord];

  var shift = '';
  var normalizedOrd = ord;
  var octaveShift = chromatic ? 12 : 7;
  var middleC = chromatic ? 60 : 21;
  var trebleB = chromatic ? 83 : 34;
  while (normalizedOrd < middleC) {
    shift += ",";
    normalizedOrd += octaveShift;
  }
  while (normalizedOrd > trebleB) {
    shift += "'";
    normalizedOrd -= octaveShift;
  }
  var bases, acc = '';
  if (chromatic) {
    bases = {
      60: 'C', 62: 'D', 64: 'E', 65: 'F', 67: 'G', 69: 'A', 71: 'B',
      72: 'c', 74: 'd', 76: 'e', 77: 'f', 79: 'g', 81: 'a', 83: 'b'
    };
    if (!bases[normalizedOrd]) {
      acc = '^';
      normalizedOrd -= 1;
    }
  } else {
    bases = {
      21: 'C', 22: 'D', 23: 'E', 24: 'F', 25: 'G', 26: 'A', 27: 'B',
      28: 'c', 29: 'd', 30: 'e', 31: 'f', 32: 'g', 33: 'a', 34: 'b'
    };
  }

  cache[ord] = acc + bases[normalizedOrd] + shift;
  return acc + bases[normalizedOrd] + shift;
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
  var swing = this.swing;
  switch(this.value) {
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
  if (this.beam)
    return true;

  var next = this.findPrev(['Note', 'Rest']);
  return next && next.beam;
};

Score.Note.prototype.isBeamStart = function(strict) {
  var next = this.findNext(['Note', 'Rest'], {neighbor: true});
  var beamed = this.beam && next && next.type == 'Note';
  if (strict) {
    var prev = this.findPrev(['Note', 'Rest'], {neighbor: true});
    return beamed && (!prev || !prev.beam);
  }
  return beamed;
};

Score.Note.prototype.beamNext = function() {
  if (!this.beam)
    return null;
  var next = this.findNext(['Note', 'Rest'], {neighbor: true});
  return next && next.type == 'Note' && next;
};

Score.Note.prototype.beamEnd = function() {
  if (!this.beam)
    return this;
  var next = this.findNext(['Note', 'Rest'], {neighbor: true});
  return next ? (next.type == 'Note' ? next.beamEnd() : this) : this;
};

Score.Note.prototype.isSharp = function() {
  return this.accidentals.indexOf('^') != -1;
};

Score.Note.prototype.isFlat = function() {
  return this.accidentals.indexOf('_') != -1;
};

Score.Note.prototype.isNatural = function() {
  return this.accidentals.indexOf('=') != -1;
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

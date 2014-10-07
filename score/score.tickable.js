
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
  var ticks = this.part.unitNoteValue();
  var prev = this.findPrev(['Note', 'Rest']);
  var dswing = prev && prev.swing;
  var uswing = this.swing;

  if (this.value.indexOf('/') != -1) {
    var parts = (this.value[0]=='/' ? ('1'+this.value) : this.value).split('/');
    ticks *= parseInt(parts[0]) / parseInt(parts[1]);
  } else {
    ticks *= parseInt(this.value);
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


Score.Tickable.prototype.change = function(opts) {
  var type = opts.type || this.type;
  var f = (type == 'Note') ? Score.Note : Score.Rest;
  var obj = (opts.type || opts.clone) ? new f(opts) : this;
  obj.value = opts.value || this.value || obj.value;
  if (f == Score.Note) {
    obj.pitch = opts.pitch || this.pitch || obj.pitch;
    if (typeof opts.accidentals == 'undefined') {
      if (typeof this.accidentals != 'undefined')
        obj.accidentals = this.accidentals;
    } else {
      obj.accidentals = opts.accidentals;
    }
    obj.swing = opts.swing || this.swing;
    obj.beam = opts.beam || this.beam;
    obj.tie = opts.tie || this.tie;
  }
  return obj;
};

Score.Tickable.prototype.clone = function() {
    return this.change({ clone: true });
};

// For Rest and Note
Score.Tickable.prototype.toABC = function() {
  var abc = '';
  abc += this.accidentals || '';
  abc += this.type == 'Rest' ? 'z' : this.pitch;
  abc += (this.value == '1' ? '' : this.value);
  if (!this.beam)
    abc += ' ';
  if (this.tie)
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

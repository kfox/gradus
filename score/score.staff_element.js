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

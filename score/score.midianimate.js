
Score.MidiAnimator = function(events) {
  this.events = events;
  this.filled = [];
};

Score.MidiAnimator.prototype.fill = function(el) {
  if (el.avatar) {
    el.avatar._preMidiFill = el.avatar.attr().fill;
    el.avatar.attr('fill', '#00f');
    this.filled.push(el);
  }
};

Score.MidiAnimator.prototype.unfill = function(el) {
  if (el.avatar) {
    el.avatar.attr('fill', el.avatar._preMidiFill || null);
    el.avatar._preMidiFill = undefined;
  }

  var i = this.filled.indexOf(el);
  (i != -1) && this.filled.splice(i, 1);
};

Score.MidiAnimator.prototype.animate = function(MIDI) {
  var midi = this;
  this.filled = [];
  MIDI.setAnimation(function(data) {
    var events = [];
    if (midi.events.length && midi.events[0].t < 1000*data.now)
      events.push(midi.events.shift());

    events.forEach(function(e) {
      e.on.forEach(function(el) { midi.fill(el) });
      e.off.forEach(function(el) { midi.unfill(el) });
    });
  });
};

Score.MidiAnimator.prototype.cleanUp = function() {
  this.filled.slice(0).forEach(function(el) { this.unfill(el) }, this);
};

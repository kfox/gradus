
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

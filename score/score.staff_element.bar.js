Score.Bar = function() {
};
Score.Bar.prototype = new Score.StaffElement();
Score.Bar.prototype.type = 'Bar';

Score.Bar.prototype.render = function(svg, x, y) {
  this.avatar = svg.line(x, y, x, y+Score.Staff.HEIGHT).stroke('#000');
  return x;
};

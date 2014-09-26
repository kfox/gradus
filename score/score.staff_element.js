Score.StaffElement = function() {
};

Score.StaffElement.prototype.ticks = function(){ return 0 };

Score.StaffElement.prototype.tickOffset = function(ref) {
    var ticks = 0;
    for (var e = ref; e != this; e = e.next)
        ticks += e.ticks();
    return ticks;
};

Score.StaffElement.prototype.isA = function(type) {
    var types = (typeof type == 'string') ? [type] : type;
    for (var i=0; i < types.length; ++i)
        if (types[i] == 'Tickable')
            types = types.concat('Note', 'Rest');
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
    return x;
};

Score.StaffElement.prototype.bindListeners = function() {
    var self = this, score = this.score;
    this.avatar.mousedown(function(e) {
        if (score.eventListeners['staff_element.mousedown'])
            score.eventListeners['staff_element.mousedown'].call(self, e);
    });
};

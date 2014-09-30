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
        };
        barEvents[tick].prestretch = prev.prestretch = 15;

        barEvents[tick].prev = prev;
        barEvents[tick].next = events[tick];
        prev.prev = events[tick].prev;
        prev.next = barEvents[tick];

        events[tick].prev = barEvents[tick];
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

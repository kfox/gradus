
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

Score.MidiWriter.prototype.ticksToMs = function(t) {
  var tempo = 120; // default. 120 crochets / sec
  var tPerBeat = Score.CROCHET; // ticks per beat, see writeHeader
  return 1000 * (t / tPerBeat) * (60 / tempo);
};

Score.MidiWriter.prototype.trackChunk = function(writer) {
  this.writeData('4D54726B'); // "MTrk"

  var eventData = '';
  writer.call(this, {
    writeData: function(data) {
      eventData += data;
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
  var event = function(t, e, d) {
    t = midi.ticksToMs(t);
    d = midi.ticksToMs(d);
    events[t] = events[t] || {t: t, on: [], off: []};
    events[t+d] = events[t+d] || {t: t+d, on: [], off: []};
    events[t].on.push(e);
    events[t+d].off.push(e);
  };

  this.trackChunk(function(track) {
    var e = part.find(['Note', 'Rest', 'Chord']);
    var t = 0;
    var delta = 0;
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


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
    //this.writeData('3c00'); // 15360 ticks per quarter note
    this.writeData('0140'); // 15360 ticks per quarter note
};

Score.MidiWriter.prototype.trackChunk = function(writer) {
    this.writeData('4D54726B'); // "MTrk"

    var eventData = '';
    writer({
        writeData: function(data) {
            eventData += data;
        }
    });

    this.writeData(toHex(eventData.length/2, 8));
    this.writeData(eventData);
};

Score.MidiWriter.prototype.writeTrack = function(part) {
    this.trackChunk(function(track) {
        var e = part.find('Tickable');
        var delta = 0;
        while (e) {
            if (e.type == 'Rest') {
                delta += e.ticks();
            } else {
                track.writeData(toHex(delta)); // delta time
                track.writeData('91'); // note on, channel 1
                track.writeData(toHex(e.ord(true), 2)); // note number
                track.writeData('7f'); // velocity (127)
/*
                track.writeData(toHex(e.ticks())); // note length
                track.writeData('81'); // note off, channel 1
                track.writeData(toHex(e.ord(true), 2)); // note number
                track.writeData('7f'); // velocity
*/
                delta = 4 * 320; // e.ticks();
            }
            e = e.findNext('Tickable');
        }

        // Silent 0-length note to finish the track
        track.writeData(toHex(delta)); // delta time
        track.writeData('91'); // note on, channel 1
        track.writeData(toHex(60, 2)); // note number
        track.writeData('00'); // velocity (127)

        track.writeData('00ff2f00'); // end of track
    });
};

Score.MidiWriter.prototype.writeMidi = function() {
    this.writeHeader();

    for (var i=0; i < this.model.parts.length; ++i)
        this.writeTrack(this.model.parts[i]);

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

    return 'data:audio/midi;base64,'+btoa(binary);
};


$(document).ready(function() {
    var source = $('#score').text();
    var score = Score.parseABC(source);
    score.render($('#score')[0], {
        events: {
            'staff_element.click': function(e) {
                if (this.type != 'Rest')
                    return;

                this.opts.type = 'note';
                this.opts.pitch = 'A';
                this.measure.replace(this, new Score.Note(this.opts));
            }
        }
    });

    MIDI.loadPlugin({
        instrument: 'acoustic_grand_piano',
        soundfontUrl: 'soundfont/',
        callback: function() {
            MIDI.Player.addListener(function(data) {
                if (data.now >= data.end)
                    MIDI.Player.stop();
            });

            key('space', function(e) {
                e.preventDefault();

                if (MIDI.Player.playing)
                    return MIDI.Player.stop();

                var midi_data = new Score.MidiWriter(score).writeMidi();
                MIDI.Player.loadFile(midi_data);
                MIDI.Player.start();
            });
        }
    });
});

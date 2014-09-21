## Road map

### 0.1 (basic prototype)

* On the page we see two treble clefs of 11 bars, fits within 1100px width max.
* Provides one hardcoded canctus firmus in treble clef using whole notes on the bottom staff
* Allows input of counterpoint (top staff) by mouse, directly on the staff. You can input on any bar, not limited to "the next empty place" (but will this cause problems with the "hyper-gradus" as described below?)
* Allows notes to be clicked and dragged to be moved up or down on the stave (not left/right though, fuck that) as well as deleted somehow (click to select and then hit delete button? drag off the staves?)
* Press play to hear the two voices from the start in shitty midi (ideally bind spacebar to play/stop) — as the notes are played, they are highlighted. 
* After note input, writes the resultant interval above the canctus firmus stave in a small font to help you out (see the book for what this looks like)
* Big "ENGAGE HYPER-GRADUS" button: Calculates and shows you the next available notes in .5 opacity across the whole cf, those options update and are constrained as more notes are entered.


### Prototype constraints (woah cowboy)

Let's not make this too hard on ourselves...

* Both cantus and counterpoint in treble clef, C Major, whole notes, no time sig (or 4/4 if it's easiest)
* Let's stick with 11 bars to start (matches the book)
* Let's provide Cantus Firmus in lower voice only for now (it can also be the upper)
* First species only, but prepare for the next species when writing the program. 


### 1.0 and beyond (dat icebox)

* Implement rules for species 2-5, with a toggle switch to change species mid-input. The toughest part (I predict) will be the entry and display of more complex note values (perhaps just a toggle for entry). The place I imagine it getting hairy is placing notes and the horizontal sensitivy on the staff, etc. Before we let people plunk down whole notes wherever, but what happens when they select eighth notes and click on the middle of the bar? Perhaps you can only enter notes in a bar from left to right but you can put notes in any bar.)
* Lets you "lock" input to only notes obeying the rules
* Shows you which rules were broken (!?)
* Lets you open a pane to specific toggle rules on/off
* Adjustable playback speed and instruments (per-staff?)
* Ability to input cantus firmi of varying lengths, select from several libraries, have it be in bass clef

## Tech to evaluate (wheel reinventing ahoy)

* https://github.com/madrobby/keymaster (simplest way to do keybindings)
* https://github.com/gasman/jasmid (simplest midi)
* https://github.com/mudcube/MIDI.js (full-featured midi, too heavy???)
* https://github.com/gleitz/midi-js-soundfonts (Fluid-Soundfont for midi.js)
* http://abcnotation.com/software#web (web implementations of the abc standard like https://github.com/paulrosen/abcjs)
* http://www.noteflight.com (check out how they implement notation input)
* Who the fuck does "inputting notes on a staff" in HTML5 — nobody? 


## Resources
* [The latin version of Gradus](http://conquest.imslp.info/files/imglnks/usimg/f/fd/IMSLP91138-PMLP187246-Fux_-_Gradus_ad_Parnassum.pdf)
* ["One of the first examples of counterpoint we have. Leonin was the very first "composer"](https://www.youtube.com/watch?v=fVjo_mhcGG8)

class Counterpoint < ActiveRecord::Base
  belongs_to :cantus_firmus

  scope :matching, ->(abc) {
    Counterpoint.connection.execute('PRAGMA case_sensitive_like = 1')
    abc = abc.gsub(/z4/, '__4').gsub(/\s+/, '')
    abc = abc.split('|').map{ |x| x.sub(/([a-gA-G])(\d)/, '\1 \2') }.join('|')
    where('counterpoints.abc LIKE ?', abc)
  }

  def self.chordify
    measures = []
    pluck(:abc).each do |abc|
      abc.split('|').each_with_index do |note, imeasure|
        measures[imeasure] ||= {}
        measures[imeasure][note.gsub(/\s+/, '')] = true
      end
    end
    measures.map{ |m| m.keys }
  end

end

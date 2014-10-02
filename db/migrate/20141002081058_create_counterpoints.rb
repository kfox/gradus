class CreateCounterpoints < ActiveRecord::Migration
  def change
    create_table :counterpoints do |t|
      t.text :abc
      t.integer :species
      t.integer :cantus_firmus_id

      t.timestamps
    end
  end
end

class CreateCantusFirmus < ActiveRecord::Migration
  def change
    create_table :cantus_firmus do |t|
      t.text :abc
      t.string :mode

      t.timestamps
    end
  end
end

class CreateGames < ActiveRecord::Migration[8.1]
  def change
    create_table :games do |t|
      t.references :black_player, null: false, foreign_key: { to_table: :users }
      t.references :white_player, null: true, foreign_key: { to_table: :users }
      t.string :status, null: false, default: 'waiting'
      t.json :board_state, null: false, default: {}
      t.json :moves, null: false, default: []
      t.references :winner, null: true, foreign_key: { to_table: :users }
      t.datetime :started_at
      t.datetime :finished_at
      t.string :game_type, null: false, default: 'vs_ai'
      t.integer :time_limit, null: true
      t.string :current_player, null: false, default: 'black'
      t.integer :move_count, null: false, default: 0
      t.string :board_size, null: false, default: '19x19'
      t.string :ai_difficulty, null: true

      t.timestamps
    end

    add_index :games, :status
    add_index :games, :game_type
    add_index :games, :created_at
  end
end

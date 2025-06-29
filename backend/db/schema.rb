# This file is auto-generated from the current state of the database. Instead
# of editing this file, please use the migrations feature of Active Record to
# incrementally modify your database, and then regenerate this schema definition.
#
# This file is the source Rails uses to define your schema when running `bin/rails
# db:schema:load`. When creating a new database, `bin/rails db:schema:load` tends to
# be faster and is potentially less error prone than running all of your
# migrations from scratch. Old migrations may fail to apply correctly if those
# migrations use external dependencies or application code.
#
# It's strongly recommended that you check this file into your version control system.

ActiveRecord::Schema[8.1].define(version: 2025_06_29_011439) do
  # These are extensions that must be enabled in order to support this database
  enable_extension "pg_catalog.plpgsql"

  create_table "games", force: :cascade do |t|
    t.string "ai_difficulty"
    t.bigint "black_player_id", null: false
    t.string "board_size", default: "19x19", null: false
    t.json "board_state", default: {}, null: false
    t.datetime "created_at", null: false
    t.string "current_player", default: "black", null: false
    t.datetime "finished_at"
    t.string "game_type", default: "vs_ai", null: false
    t.integer "move_count", default: 0, null: false
    t.json "moves", default: [], null: false
    t.datetime "started_at"
    t.string "status", default: "waiting", null: false
    t.integer "time_limit"
    t.datetime "updated_at", null: false
    t.bigint "white_player_id"
    t.bigint "winner_id"
    t.index ["black_player_id"], name: "index_games_on_black_player_id"
    t.index ["created_at"], name: "index_games_on_created_at"
    t.index ["game_type"], name: "index_games_on_game_type"
    t.index ["status"], name: "index_games_on_status"
    t.index ["white_player_id"], name: "index_games_on_white_player_id"
    t.index ["winner_id"], name: "index_games_on_winner_id"
  end

  create_table "users", force: :cascade do |t|
    t.string "avatar_url"
    t.datetime "created_at", null: false
    t.datetime "current_sign_in_at"
    t.string "current_sign_in_ip"
    t.string "email", default: "", null: false
    t.string "encrypted_password", default: "", null: false
    t.string "first_name"
    t.integer "games_drawn", default: 0
    t.integer "games_lost", default: 0
    t.integer "games_played", default: 0
    t.integer "games_won", default: 0
    t.string "last_name"
    t.datetime "last_sign_in_at"
    t.string "last_sign_in_ip"
    t.json "oauth_data"
    t.string "provider"
    t.decimal "rating", precision: 8, scale: 2, default: "1200.0"
    t.datetime "remember_created_at"
    t.datetime "reset_password_sent_at"
    t.string "reset_password_token"
    t.integer "sign_in_count", default: 0, null: false
    t.string "uid"
    t.datetime "updated_at", null: false
    t.string "username", null: false
    t.index ["email"], name: "index_users_on_email", unique: true
    t.index ["provider", "uid"], name: "index_users_on_provider_and_uid", unique: true
    t.index ["reset_password_token"], name: "index_users_on_reset_password_token", unique: true
    t.index ["username"], name: "index_users_on_username", unique: true
  end

  add_foreign_key "games", "users", column: "black_player_id"
  add_foreign_key "games", "users", column: "white_player_id"
  add_foreign_key "games", "users", column: "winner_id"
end

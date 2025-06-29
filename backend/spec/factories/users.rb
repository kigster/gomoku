FactoryBot.define do
  factory :user do
    sequence(:email) { |n| "user#{n}@example.com" }
    sequence(:username) { |n| "user#{n}" }
    password { "password123" }
    password_confirmation { "password123" }
    first_name { "John" }
    last_name { "Doe" }

    trait :with_full_profile do
      first_name { "Alice" }
      last_name { "Smith" }
      avatar_url { "https://example.com/avatar.jpg" }
    end

        trait :oauth_google do
      provider { User::OAUTH_PROVIDERS[0] } # google_oauth2
      sequence(:uid) { |n| "google_#{n}" }
      oauth_data {
        {
          provider: User::OAUTH_PROVIDERS[0],
          uid: uid,
          info: {
            email: email,
            name: "#{first_name} #{last_name}",
            image: "https://lh3.googleusercontent.com/a/avatar"
          }
        }.to_json
      }
    end

    trait :oauth_github do
      provider { User::OAUTH_PROVIDERS[1] } # github
      sequence(:uid) { |n| "github_#{n}" }
      oauth_data {
        {
          provider: User::OAUTH_PROVIDERS[1],
          uid: uid,
          info: {
            email: email,
            nickname: username,
            name: "#{first_name} #{last_name}",
            image: "https://avatars.githubusercontent.com/u/#{uid}?v=4"
          }
        }.to_json
      }
    end

        trait :experienced_player do
      games_played { 50 }
      games_won { 30 }
      games_lost { 15 }
      games_drawn { 5 }
      rating { User::DEFAULT_RATING + 250 } # 1450
    end

    trait :beginner_player do
      games_played { 5 }
      games_won { 2 }
      games_lost { 3 }
      games_drawn { 0 }
      rating { User::DEFAULT_RATING - 50 } # 1150
    end

    trait :master_player do
      games_played { 200 }
      games_won { 150 }
      games_lost { 40 }
      games_drawn { 10 }
      rating { User::DEFAULT_RATING + 600 } # 1800
    end

    trait :with_long_username do
      username { "verylongusername20" }
    end

    trait :with_special_chars_username do
      username { "user_123" }
    end
  end
end

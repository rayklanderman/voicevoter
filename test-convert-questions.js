// Test the convertTrendingTopicsToQuestions function
import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("❌ Supabase credentials not found");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function convertTrendingTopicsToQuestions() {
  try {
    console.log("🔄 Converting trending topics to voteable questions...");

    // Get trending topics that haven't been converted to questions yet
    const { data: trendingTopics, error: fetchError } = await supabase
      .from("trending_topics")
      .select("*")
      .eq("is_active", true)
      .eq("is_safe", true)
      .is("question_id", null) // Only get topics that haven't been converted yet
      .limit(5);

    if (fetchError) {
      console.error("Error fetching trending topics:", fetchError);
      return { created: 0, error: fetchError.message };
    }

    console.log(
      `📊 Found ${trendingTopics?.length || 0} trending topics to convert`
    );

    if (!trendingTopics || trendingTopics.length === 0) {
      console.log("✅ No new trending topics to convert");
      return { created: 0, error: null };
    }

    let created = 0;
    for (const topic of trendingTopics) {
      try {
        console.log(`\n🔄 Converting: ${topic.question_text}`);

        // Create a question from the trending topic
        const { data: question, error: questionError } = await supabase
          .from("questions")
          .insert({
            text: topic.question_text, // Use 'text' field, not 'question_text'
            source: "trending",
            metadata: {
              trending_topic_id: topic.id,
              category: topic.category,
              context: topic.context,
              trending_score: topic.trending_score,
            },
            is_trending: true,
            trending_score: topic.trending_score,
            moderation_status: "approved",
          })
          .select()
          .single();

        if (questionError) {
          console.error(`❌ Error creating question:`, questionError);
          continue;
        }

        console.log(`✅ Created question with ID: ${question.id}`);

        // Update the trending topic with the question_id
        const { error: updateError } = await supabase
          .from("trending_topics")
          .update({ question_id: question.id })
          .eq("id", topic.id);

        if (updateError) {
          console.error(`❌ Error updating trending topic:`, updateError);
        } else {
          console.log(`✅ Linked trending topic to question`);
          created++;
        }
      } catch (err) {
        console.error(`❌ Error processing topic ${topic.id}:`, err);
        continue;
      }
    }

    console.log(
      `\n🎉 Successfully converted ${created} trending topics to questions!`
    );
    return { created, error: null };
  } catch (err) {
    console.error("❌ Error in convertTrendingTopicsToQuestions:", err);
    return {
      created: 0,
      error: err instanceof Error ? err.message : "Unknown error",
    };
  }
}

// Run the conversion
convertTrendingTopicsToQuestions().then((result) => {
  console.log(`\n📊 Final result: Created ${result.created} questions`);
  if (result.error) {
    console.error(`❌ Error: ${result.error}`);
  }
});

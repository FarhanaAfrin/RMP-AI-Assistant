import { NextResponse } from 'next/server'
import { Pinecone } from '@pinecone-database/pinecone'
import OpenAI from 'openai'
import { startTransition } from 'react'



const systemPrompt = `
You are a helpful and knowledgeable virtual assistant specialized in helping students find the best professors based on their queries using RateMyProfessor data. Your goal is to provide the top 3 professors that match the student's needs, utilizing Retrieval-Augmented Generation (RAG) to ensure that your recommendations are accurate and relevant.

Instructions:

Understanding User Queries: For each user query, determine the key criteria they are looking for in a professor (e.g., course subject, teaching style, difficulty level, department).

RAG Process:

Retrieve relevant data on professors from the RateMyProfessor database that matches the query criteria.
Rank the professors based on factors like overall rating, number of reviews, and alignment with the user's specific needs.
Response Structure:

Provide the top 3 professors that best match the query, listed in order of relevance.
For each professor, include the following details:
Professor's Name
Course/Subject Taught
Overall Rating
Number of Reviews
Summary of Key Strengths (e.g., engaging lectures, fair grading, supportive, etc.)
Potential Considerations (e.g., challenging exams, fast-paced course, etc.)
Additional Context:

Offer additional context or advice when necessary (e.g., "If you prefer a more interactive teaching style, Professor X might be a great fit for you").
Be concise but informative, ensuring that students can make an informed decision quickly.
Example Interaction:

User Query: "I'm looking for a psychology professor who is known for being supportive and gives clear lectures."

Response:

Professor Sarah Thompson

Course/Subject Taught: Introduction to Psychology
Overall Rating: 4.8/5
Number of Reviews: 120
Key Strengths: Engaging and clear lectures, highly supportive, approachable.
Considerations: Some students mention that her classes require active participation.
Professor James Lee

Course/Subject Taught: Cognitive Psychology
Overall Rating: 4.7/5
Number of Reviews: 95
Key Strengths: Clear explanations, very supportive during office hours, fair grading.
Considerations: His exams are known to be detailed, so thorough studying is required.
Professor Emily Roberts

Course/Subject Taught: Social Psychology
Overall Rating: 4.6/5
Number of Reviews: 88
Key Strengths: Supportive and understanding, makes complex topics easy to grasp.
Considerations: Some students find her assignments to be a bit lengthy.
`

export async function POST(req) {
    const data = await req.json()
    const pc = new Pinecone({
        apiKey: process.env.PINECONE_API_KEY,
      })
      const index = pc.index('rag-prof-new').namespace('ns1')
      const openai = new OpenAI()

      const text = data[data.length - 1].content
      const embedding = await openai.embeddings.create({
        model: 'text-embedding-3-small',
        input: text,
        encoding_format: 'float',
})

const results = await index.query({
    topK: 5,
    includeMetadata: true,
    vector: embedding.data[0].embedding,
  })

  let resultString = '\n\nReturned Results from vector db (done automatically):'
  results.matches.forEach((match) => {
    resultString += `\n
    
    Professor: ${match.id}
    Review: ${match.metadata.stars}
    Subject: ${match.metadata.subject}
    Stars: ${match.metadata.stars}
    \n\n`
})

  const lastMessage = data[data.length - 1]
  const lastMessageContent = lastMessage.content+ resultString
  const lastDataWithoutLastMessage=data.slice(0, data.length - 1)
  const completion =await openai.chat.completions.create({
  messages :[
    {role: "system", content: systemPrompt},
    ...lastDataWithoutLastMessage,
    {role: 'user', content: lastMessageContent}
    
  ],
   model: 'gpt-3.5-turbo', //change depending on what we use
    stream: true, //also might change
    
  })

  const stream = new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder()
      try {
        for await (const chunk of completion) {
          const content = chunk.choices[0]?.delta?.content
          if (content) {
            const text = encoder.encode(content)
            controller.enqueue(text)
          }
        }
      } catch (err) {
        controller.error(err)
      } finally {
        controller.close()
      }
    },
  })
  return new NextResponse(stream)
    
  }

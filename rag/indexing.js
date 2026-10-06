import {PDFLoader} from "@langchain/community/document_loaders/fs/pdf"
import {OpenAIEmbeddings} from "@langchain/openai"
import {QdrantVectorStore} from "@langchain/qdrant"
async function generateVectorEmbeddings(filePath){
    const loader =  new PDFLoader(filePath)
    const pdfToText = await loader.load();//already chunks data page by page 
    console.log("hiii",pdfToText);
    console.log("pdf size",pdfToText.length);
    if (pdfToText.length > 0) {
        console.log(pdfToText[0].pageContent);
      }

    //initialized an embedding model for creating embedding of document 
const embeddingModel = new OpenAIEmbeddings({
    model:"text-embedding-3-small",
    apiKey:'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'
});

const vectorStore = await QdrantVectorStore.fromExistingCollection(embeddingModel,{
     url:"http://localhost:6333",
     collectionName:"langchainjs-testing"
})
try {
    await vectorStore.addDocuments(pdfToText);
    console.log("documents added successfully")
} catch (error) {
    console.log("Error",error)
}

console.log('All documents are indexed');
}

generateVectorEmbeddings("./try.pdf");




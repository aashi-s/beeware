from dotenv import load_dotenv
from fastapi import Body, FastAPI
from fastapi.middleware.cors import CORSMiddleware
from image_processing import VarroaDetector
from pydantic import BaseModel
from pydantic_settings import BaseSettings

varroa_detector = VarroaDetector()

# ################################### FastAPI setup ###########################################

settings = BaseSettings()

app = FastAPI()

# origins = ["http://localhost:8081"]
origins = ["*"]


app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


load_dotenv()


def format_docs(docs):
    return "\n\n".join(doc.page_content for doc in docs)


class Input(BaseModel):
    question: str


class Metadata(BaseModel):
    conversation_id: str


class Config(BaseModel):
    metadata: Metadata


class RequestBody(BaseModel):
    temperature: str | None
    image: str
    overrideTreatment: str | None
    numDays: int | None


@app.get("/")
def read_root():
    return {"Hello": "World"}


@app.post("/temperature")
async def chat(
    query: RequestBody = Body(...),
):
    return varroa_detector.select_folder(
        query.temperature, query.image, query.overrideTreatment, query.numDays
    )

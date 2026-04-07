import traceback

from dotenv import load_dotenv
from fastapi import Body, FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
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
    broodless: str
    supersOn: str


class VerifyRequestBody(BaseModel):
    image: str


@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    tb = traceback.format_exc()
    print("UNHANDLED EXCEPTION:", tb)
    return JSONResponse(status_code=500, content={"error": str(exc), "traceback": tb})


@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    print("VALIDATION ERROR:", exc.errors())
    return JSONResponse(status_code=422, content={"detail": exc.errors()})


@app.get("/")
def read_root():
    return {"Hello": "World"}


@app.post("/detectAndTreat")
async def detectAndTreat(
    query: RequestBody = Body(...),
):
    print("hits backend for detection")
    return varroa_detector.select_folder(
        query.broodless,
        query.supersOn,
        query.temperature,
        query.image,
        query.overrideTreatment,
        query.numDays,
    )


@app.post("/verifyImage")
async def verifyImage(
    query: VerifyRequestBody = Body(...),
):
    print("hits backend for verification")
    return varroa_detector.verify_image(query.image)

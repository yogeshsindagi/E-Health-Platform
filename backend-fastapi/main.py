from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from routes import register, login, admin, appointments, prescriptions, hospitals, users

app = FastAPI(title="Secure E-Health Platform")


app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(register.router)
app.include_router(login.router)
app.include_router(admin.router)
app.include_router(appointments.router)
app.include_router(prescriptions.router)
app.include_router(hospitals.router)
app.include_router(users.router)

@app.get("/")
def root():
    return {"status": "E-Health Backend Running"}

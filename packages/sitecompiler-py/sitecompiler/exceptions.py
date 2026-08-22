class SiteCompilerError(Exception):
    def __init__(self, message: str, status_code: int = None, details: dict = None):
        super().__init__(message)
        self.status_code = status_code
        self.details = details or {}

class AuthenticationError(SiteCompilerError):
    pass

class PaymentRequiredError(SiteCompilerError):
    pass

class JobNotFoundError(SiteCompilerError):
    pass

class TimeoutError(SiteCompilerError):
    pass

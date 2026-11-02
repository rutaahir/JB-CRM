from rest_framework.exceptions import APIException
from rest_framework import status
from rest_framework.response import Response

class AccountDisabledException(APIException):
    status_code = status.HTTP_403_FORBIDDEN
    default_detail = "Your access has been disabled by the administrator. Please contact admin."
    default_code = "account_disabled"

    def __init__(self, detail=None, code=None):
        if detail is None:
            detail = self.default_detail
        if code is None:
            code = self.default_code
        self.detail = detail
        self.code = code

def custom_exception_handler(exc, context):
    # Dynamic import to avoid circular import during Django REST framework startup
    from rest_framework.views import exception_handler

    if isinstance(exc, AccountDisabledException):
        return Response({
            "code": "account_disabled",
            "detail": "Your access has been disabled by the administrator. Please contact admin."
        }, status=status.HTTP_403_FORBIDDEN)

    response = exception_handler(exc, context)

    if response is not None:
        if isinstance(response.data, dict):
            if response.data.get('code') == 'account_disabled' or 'disabled by the administrator' in str(response.data.get('detail', '')):
                response.status_code = status.HTTP_403_FORBIDDEN
                response.data = {
                    "code": "account_disabled",
                    "detail": "Your access has been disabled by the administrator. Please contact admin."
                }
    return response

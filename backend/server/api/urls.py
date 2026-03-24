from django.urls import path
from .views import predict, auth_protected_data

urlpatterns = [
    path('predict/', predict, name='predict'),
    path('protected/', auth_protected_data, name='protected_data'),
]

from django.urls import path
from .views import (
    AdminTerritoryListCreateView,
    AdminTerritoryDetailView,
    UserAddTerritoryByCodeView,
    UserTerritoriesView,
    BookingListCreateView,
    MachineListView,
    InstructionTemplateView,
)


urlpatterns = [
    path("admin/", AdminTerritoryListCreateView.as_view(), name="territory-list-create"),
    path("admin/<int:pk>/", AdminTerritoryDetailView.as_view(), name="territory-detail"),
    path("join/", UserAddTerritoryByCodeView.as_view(), name="territory-join"),
    path("mine/", UserTerritoriesView.as_view(), name="territory-mine"),
    path("bookings/", BookingListCreateView.as_view(), name="territory-bookings"),
    path("<int:territory_id>/structure/", MachineListView.as_view(), name="territory-structure"),
    path("instructions/", InstructionTemplateView.as_view(), name="territory-instructions"),
]

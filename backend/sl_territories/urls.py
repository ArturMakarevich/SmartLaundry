from django.urls import path
from .views import (
    AdminTerritoryListCreateView,
    AdminTerritoryDetailView,
    AdminDashboardView,
    AdminTerritoryUserActionView,
    AdminMachineActionView,
    AdminInviteCodeView,
    UserAddTerritoryByCodeView,
    UserTerritoriesView,
    UserLeaveTerritoryView,
    BookingListCreateView,
    BookingDetailView,
    MachineListView,
    InstructionTemplateView,
    UserNotificationListView,
    ProblemReportView,
    ProblemReportDetailView,
)


urlpatterns = [
    path("admin/", AdminTerritoryListCreateView.as_view(), name="territory-list-create"),
    path("admin/dashboard/", AdminDashboardView.as_view(), name="territory-admin-dashboard"),
    path("admin/<int:pk>/", AdminTerritoryDetailView.as_view(), name="territory-detail"),
    path("admin/<int:pk>/invite-code/", AdminInviteCodeView.as_view(), name="territory-invite-code"),
    path("admin/<int:territory_id>/users/<int:user_id>/action/", AdminTerritoryUserActionView.as_view(), name="territory-admin-user-action"),
    path("admin/machines/<int:machine_id>/action/", AdminMachineActionView.as_view(), name="territory-admin-machine-action"),
    path("join/", UserAddTerritoryByCodeView.as_view(), name="territory-join"),
    path("mine/", UserTerritoriesView.as_view(), name="territory-mine"),
    path("mine/<int:territory_id>/leave/", UserLeaveTerritoryView.as_view(), name="territory-leave"),
    path("bookings/", BookingListCreateView.as_view(), name="territory-bookings"),
    path("bookings/<int:pk>/", BookingDetailView.as_view(), name="territory-booking-detail"),
    path("notifications/", UserNotificationListView.as_view(), name="territory-notifications"),
    path("<int:territory_id>/structure/", MachineListView.as_view(), name="territory-structure"),
    path("instructions/", InstructionTemplateView.as_view(), name="territory-instructions"),
    path("problem-reports/", ProblemReportView.as_view(), name="territory-problem-reports"),
    path("problem-reports/<int:pk>/", ProblemReportDetailView.as_view(), name="territory-problem-report-detail"),
]

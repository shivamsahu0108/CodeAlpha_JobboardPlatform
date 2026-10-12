from rest_framework.permissions import BasePermission


class IsEmployer(BasePermission):
    def has_permission(self, request, view):
        user = request.user

        if not user or not user.is_authenticated:
            return False

        return (
            hasattr(user, "profile")
            and user.profile.role == "Employer"
        )

    
class IsCandidate(BasePermission):
    def has_permission(self, request, view):
        user = request.user

        if not user or not user.is_authenticated:
            return False

        return (
            hasattr(user, "profile")
            and user.profile.role == "Candidate"
        )
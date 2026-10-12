from django.contrib import admin


from .models import (
    UserProfile,
    Employer,
    Candidate,
    JobListing,
    Resume,
    JobApplication,
    Notification,
)


admin.site.register(UserProfile)
admin.site.register(Employer)
admin.site.register(Candidate)
admin.site.register(JobListing)
admin.site.register(Resume)
admin.site.register(JobApplication)
admin.site.register(Notification)
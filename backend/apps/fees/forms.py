from django import forms

from .models import Course, QuotaCategory


class FeeCalculatorForm(forms.Form):
    course = forms.ModelChoiceField(Course.objects.all())
    quota = forms.ModelChoiceField(QuotaCategory.objects.all())
    installments = forms.IntegerField(min_value=1, max_value=12, initial=1)

FROM kalilinux/kali-rolling

ENV DEBIAN_FRONTEND=noninteractive

RUN apt-get update && \
    apt-get install -y --no-install-recommends \
        python3 \
        python3-pip \
        python3-venv \
        python3-pil \
        awscli \
        binwalk \
        foremost \
        steghide \
        outguess \
        exiftool \
        pngcheck \
        ruby \
        ruby-dev \
        default-jdk \
        git \
        wget

RUN gem install zsteg

RUN python3 -m venv /opt/venv
ENV PATH="/opt/venv/bin:$PATH"
RUN /opt/venv/bin/python -m ensurepip --upgrade
RUN /opt/venv/bin/pip install --no-cache-dir flask pillow supabase

WORKDIR /app

COPY . .

EXPOSE 5000

CMD ["python3", "app.py"]

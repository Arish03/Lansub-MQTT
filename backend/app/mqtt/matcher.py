def topic_matches(pattern: str, topic: str) -> bool:
    """
    Check if a published topic matches an MQTT subscription pattern.
    Handles '+' (single-level) and '#' (multi-level) wildcards.
    """
    if not pattern or not topic:
        return False

    if pattern == topic or pattern == "#":
        return True

    pattern_parts = pattern.split("/")
    topic_parts = topic.split("/")

    i = 0
    p_len = len(pattern_parts)
    t_len = len(topic_parts)

    while i < p_len and i < t_len:
        p = pattern_parts[i]
        t = topic_parts[i]

        if p == "#":
            # '#' must be the last part of a valid pattern and matches everything remaining
            return True
        elif p == "+":
            # '+' matches exactly one topic level
            i += 1
            continue
        elif p != t:
            return False
        i += 1

    # Check if the pattern ended with '/#' and topic had no extra level
    if i == p_len - 1 and pattern_parts[i] == "#":
        return True

    return i == p_len and i == t_len
